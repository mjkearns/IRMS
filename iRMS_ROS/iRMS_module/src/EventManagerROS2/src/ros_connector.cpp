/*
 * rosinputconnector.cpp
 *
 *  Created on: 6 Apr. 2021
 *      Author: chawksley
 */

#include "ros_connector.hpp"
#include "rclcpp/executor.hpp"
#include <boost/json.hpp>
#include <boost/json/src.hpp>
#include <boost/lexical_cast.hpp>
#include <boost/algorithm/string.hpp>
#include "nav2_msgs/action/follow_waypoints.hpp"
#include "geometry_msgs/msg/pose_stamped.hpp"
#include "nav2_util/geometry_utils.hpp"
#include <chrono>
#include <sstream>

RosConnector::RosConnector() : server_timeout_(10), fRunThread(false)
{
  auto options = rclcpp::NodeOptions().arguments({"--ros-args --remap __node:=navigation_dialog_action_client"});
  client_node_ = std::make_shared<rclcpp::Node>("_", options);

	subscription_ = client_node_->create_subscription<std_msgs::msg::String>("topic", 10, std::bind(&RosConnector::topic_callback, this, std::placeholders::_1));
	fLoadMapClient = client_node_->create_client<nav2_msgs::srv::LoadMap>("load_map");
  waypoint_follower_action_client_ = rclcpp_action::create_client<nav2_msgs::action::FollowWaypoints>(client_node_, "follow_waypoints");
  waypoint_follower_goal_ = nav2_msgs::action::FollowWaypoints::Goal();
}

RosConnector::~RosConnector()
{
}

bool RosConnector::Start(MessageInterchange *inMessageInterchange)
{

  fMessageInterchange = inMessageInterchange;

  fInterchangeThread = boost::shared_ptr<boost::thread>(new boost::thread(boost::bind(&RosConnector::RunInterchangeThread, this)));
	return true;
}

void RosConnector::Stop()
{
  fRunThread = false;
  fInterchangeThread->join();
}

void RosConnector::SendLoadMapMessage(const std::string &inMapMetadataPath)
{
  auto request = std::make_shared<nav2_msgs::srv::LoadMap::Request>();
  request->map_url = inMapMetadataPath;

  while (!fLoadMapClient->wait_for_service(std::chrono::seconds(1))) {
    if (!rclcpp::ok()) {
      RCLCPP_ERROR(rclcpp::get_logger("rclcpp"), "Interrupted while waiting for the service. Exiting.");
      return;
    }
    RCLCPP_INFO(rclcpp::get_logger("rclcpp"), "service not available, waiting again...");
  }

  auto result = fLoadMapClient->async_send_request(request);
}

void RosConnector::ProcessIncomingMessage(const std::string inMessage)
{
  std::cout << "from ROS: " << inMessage << std::endl;
  boost::json::error_code aErr;
  boost::json::value aValue = boost::json::parse(inMessage, aErr);
  if (!aErr && aValue.is_object())
  {
    boost::json::object aObj;
    try {
      aObj = aValue.at("robot").as_object();
    }
    catch(std::out_of_range &e)
    {
      return;
    }
    DoProcessLoadMessage(aObj);
    DoProcessWaypointsMessage(aObj);
    DoProcessMoveMessage(aObj);
  }
}

void RosConnector::DoProcessLoadMessage(const boost::json::object &inMessageObj)
{
  try {
    boost::json::value aVal = inMessageObj.at("load_map");
    if (aVal.is_number())
    {
      fPointLists.clear();
      //TODO create ROS load_map request
    }
  }
  catch (std::out_of_range &e)
  {
  }
}

void RosConnector::DoProcessWaypointsMessage(const boost::json::object &inMessageObj)
{
  try {
    boost::json::object aMap = inMessageObj.at("map").as_object();
    boost::json::object aCommand = aMap.at("point_list").as_object();
    uint64_t aPointListId = boost::lexical_cast<uint64_t>(aCommand.at("id").as_string().c_str());
    TPointList &aPointList = fPointLists[aPointListId];
    aPointList.clear();
    boost::json::value aPoints = aCommand.at("point");
    if (aPoints.is_string())
    {
      std::string aPointString(aPoints.as_string().c_str());
      AddPoint(aPointList, aPointString);
    }
    else if (aPoints.is_array())
    {
      boost::json::array aPointArray = aPoints.as_array();
      for (boost::json::array::const_iterator aIter = aPointArray.cbegin(); aIter != aPointArray.cend(); aIter++)
      {
        if (aIter->is_string())
        {
          std::string aPointString(aIter->as_string().c_str());
          AddPoint(aPointList, aPointString);
        }
      }
    }
  }
  catch (std::out_of_range &e)
  {
  }
}

void RosConnector::AddPoint(TPointList &inPointList, const std::string &inPointString)
{
  std::vector<std::string> aFields;
  boost::split(aFields, inPointString, boost::is_any_of(", "), boost::token_compress_on);
  TWayPoint aWayPoint;
  if (aFields.size() > 1)
  {
    aWayPoint.x = boost::lexical_cast<double_t>(aFields[0]);
    aWayPoint.y = boost::lexical_cast<double_t>(aFields[1]);
    inPointList.push_back(aWayPoint);
  }
}

void RosConnector::DoProcessMoveMessage(const boost::json::object &inMessageObj)
{
  try {
    boost::json::object aCommand = inMessageObj.at("start").as_object();
    uint64_t aPointListId = boost::lexical_cast<uint64_t>(aCommand.at("point_list_id").as_string().c_str());
    if (fPointLists.count(aPointListId))
    {
      TPointList aPointList = fPointLists[aPointListId];
      BuildFollowWaypointsMessage(aPointList);
      //DoFollowWaypointsAction();
      //YAML::Emitter aYaml;
      //FollowWaypointsMsgToYaml(waypoint_follower_goal_, aYaml);
      //std::cout << aYaml.c_str() << std::endl;
      std::string aJsonStr;
      FollowWaypointsMsgToJson(waypoint_follower_goal_, aJsonStr);
      DoRunFollowWaypointsActionInShell(aJsonStr);
    }
    else
    {
      std::cout << "Points list with id " << aPointListId << " not found" << std::endl;
    }
  }
  catch (std::out_of_range &e)
  {
  }
}

void RosConnector::RunInterchangeThread()
{
  fRunThread = true;
  std::string aMessage;
  while (fRunThread)
  {
    aMessage.clear();
    if (fMessageInterchange->GetNextMessageForROS(aMessage))
    {
      ProcessIncomingMessage(aMessage);
    }
    usleep(16);
  }
}

void RosConnector::FollowWaypointsMsgToYaml(nav2_msgs::action::FollowWaypoints::Goal &inMsg, YAML::Emitter &outYaml)
{

  outYaml << YAML::Key << "poses";
  outYaml << YAML::BeginSeq;
  for (std::vector<geometry_msgs::msg::PoseStamped>::iterator aIter = inMsg.poses.begin(); aIter != inMsg.poses.end(); aIter++)
  {
    outYaml << YAML::Key << "header" << YAML::BeginMap
            //<< YAML::Key << "stamp" << YAML::Value << aPose.header.stamp
            << YAML::Key << "frame_id" << YAML::Value << aIter->header.frame_id
            << YAML::EndMap;

    outYaml << YAML::Key << "pose" << YAML::BeginMap;

    outYaml << YAML::Key << "position" << YAML::BeginMap
            << YAML::Key << "x" << YAML::Value << aIter->pose.position.x
            << YAML::Key << "y" << YAML::Value << aIter->pose.position.y
            << YAML::Key << "z" << YAML::Value << aIter->pose.position.z
            << YAML::EndMap;

    outYaml << YAML::Key << "orientation" << YAML::BeginMap
            << YAML::Key << "x" << YAML::Value << aIter->pose.orientation.x
            << YAML::Key << "y" << YAML::Value << aIter->pose.orientation.y
            << YAML::Key << "z" << YAML::Value << aIter->pose.orientation.z
            << YAML::Key << "w" << YAML::Value << aIter->pose.orientation.w
            << YAML::EndMap;

    outYaml << YAML::EndMap;
  }
  outYaml << YAML::EndSeq;
}

void RosConnector::FollowWaypointsMsgToJson(nav2_msgs::action::FollowWaypoints::Goal &inMsg, std::string &outJson)
{
  std::stringstream ss;
  bool aFirstPass = true;
  ss << "{poses: [ ";
  for (std::vector<geometry_msgs::msg::PoseStamped>::iterator aIter = inMsg.poses.begin(); aIter != inMsg.poses.end(); aIter++)
  {
    ss << (aFirstPass ? " " : ", ");
    ss << "{";

    ss << "header: {"
      << "frame_id" << ": " << aIter->header.frame_id
      << "}, ";

    ss  << "pose: {";

    ss  << "position: {"
      << "x" << ": " << aIter->pose.position.x
      << ", y" << ": " << aIter->pose.position.y
      << ", z" << ": " << aIter->pose.position.z
      << "}, ";

    ss  << "orientation: {"
      << "x" << ": " << aIter->pose.orientation.x
      << ", y" << ": " << aIter->pose.orientation.y
      << ", z" << ": " << aIter->pose.orientation.z
      << ", w" << ": " << aIter->pose.orientation.w
      << "} ";

    ss << "}";
    ss << "}";
    aFirstPass = false;
  }
  ss << " ] }";
  outJson = ss.str();
}

void RosConnector::BuildFollowWaypointsMessage(TPointList &inWayPoints)
{
  waypoint_follower_goal_.poses.clear();

  for (TPointList::iterator aIter = inWayPoints.begin(); aIter != inWayPoints.end(); aIter++)
  {
    geometry_msgs::msg::PoseStamped aPose;
    aPose.header.stamp = rclcpp::Clock().now();
    aPose.header.frame_id = "map";
    aPose.pose.position.x = aIter->x;
    aPose.pose.position.y = aIter->y;
    aPose.pose.position.z = 0;
    aPose.pose.orientation = nav2_util::geometry_utils::orientationAroundZAxis(1);

    waypoint_follower_goal_.poses.push_back(aPose);
  }
}

void RosConnector::DoFollowWaypointsAction()
{
  auto is_action_server_ready = waypoint_follower_action_client_->wait_for_action_server(std::chrono::seconds(5));
  if (!is_action_server_ready) {
    RCLCPP_ERROR(client_node_->get_logger(), "follow_waypoints action server is not available.");
    return;
  }

  std::cout << "Sending " << waypoint_follower_goal_.poses.size() << " poses" << std::endl;
  auto send_goal_options = rclcpp_action::Client<nav2_msgs::action::FollowWaypoints>::SendGoalOptions();
  send_goal_options.result_callback = [](auto) {};

  auto future_goal_handle = waypoint_follower_action_client_->async_send_goal(waypoint_follower_goal_, send_goal_options);
  if (rclcpp::spin_until_future_complete(client_node_, future_goal_handle, server_timeout_) != rclcpp::FutureReturnCode::SUCCESS)
  {
    RCLCPP_ERROR(client_node_->get_logger(), "Send goal call failed");
    return;
  }

  // Get the goal handle and save so that we can check on completion in the timer callback
  waypoint_follower_goal_handle_ = future_goal_handle.get();
  if (!waypoint_follower_goal_handle_) {
    RCLCPP_ERROR(client_node_->get_logger(), "Goal was rejected by server");
    return;
  }
}

void RosConnector::DoRunFollowWaypointsActionInShell(const std::string &inActionMessage)
{
  if (fRosFollowWaypointAction.running())
  {
    fRosFollowWaypointAction.terminate();
    fFollowWaypointsActionProcessStream.close();
  }
  fRosFollowWaypointAction.wait();

  fFollowWaypointsActionProcessStream = boost::process::ipstream();
  auto env = boost::this_process::environment();
  fRosFollowWaypointAction = boost::process::child(boost::process::search_path("ros2"), "action", "send_goal", "/FollowWaypoints", "nav2_msgs/action/FollowWaypoints", inActionMessage, boost::process::std_out > fFollowWaypointsActionProcessStream, env);
  fRosFollowWaypointAction.detach();
}