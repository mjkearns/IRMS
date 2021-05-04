/*
 * rosinputconnector.hpp
 *
 *  Created on: 6 Apr. 2021
 *      Author: chawksley
 */

#ifndef ROSINPUTCONNECTOR_HPP_
#define ROSINPUTCONNECTOR_HPP_

#include "nav2_lifecycle_manager/lifecycle_manager_client.hpp"
#include "rclcpp/rclcpp.hpp"
#include "rclcpp_action/rclcpp_action.hpp"
#include "std_msgs/msg/string.hpp"
#include "nav2_msgs/srv/load_map.hpp"
#include "nav2_msgs/action/follow_waypoints.hpp"
#include "message_interchange.hpp"
#include <boost/thread.hpp>
#include <boost/shared_ptr.hpp>
#include <boost/json.hpp>
#include <boost/process.hpp>

#include <yaml-cpp/yaml.h>

#include <vector>
#include <map>

class RosConnector {
public:
	typedef struct SWayPoint
	{
		SWayPoint() : x(0), y(0), v(0), a(0), t(0) {}
		double_t x;
		double_t y;
		double_t v;
		double_t a;
		double_t t;
	} TWayPoint;
	typedef std::vector<TWayPoint> TPointList;
	typedef std::map<uint16_t, TPointList> TPointListMap;

	RosConnector();
	virtual ~RosConnector();

	bool Start(MessageInterchange *inMessageInterchange);
	void Stop();

	void SendLoadMapMessage(const std::string &inMapMetadataPath);
  rclcpp::Node::SharedPtr GetBaseNode() {return client_node_;}
private:
  using WaypointFollowerGoalHandle = rclcpp_action::ClientGoalHandle<nav2_msgs::action::FollowWaypoints>;
	std::chrono::milliseconds server_timeout_;
	rclcpp::Node::SharedPtr client_node_;
  rclcpp_action::Client<nav2_msgs::action::FollowWaypoints>::SharedPtr waypoint_follower_action_client_;
  nav2_msgs::action::FollowWaypoints::Goal waypoint_follower_goal_;
  WaypointFollowerGoalHandle::SharedPtr waypoint_follower_goal_handle_;

	void topic_callback(const std_msgs::msg::String::SharedPtr msg)
    {
      RCLCPP_INFO(client_node_->get_logger(), "I heard: '%s'", msg->data.c_str());
    }

	void RunInterchangeThread();
	void ProcessIncomingMessage(const std::string inMessage);
	void DoProcessLoadMessage(const boost::json::object &inMessageObj);
	void DoProcessWaypointsMessage(const boost::json::object &inMessageObj);
	void DoProcessMoveMessage(const boost::json::object &inMessageObj);
	void AddPoint(TPointList &inPointList, const std::string &inPointString);
	void DoFollowWaypointsAction();
  void DoRunFollowWaypointsActionInShell(const std::string &inActionMessage);

  void BuildFollowWaypointsMessage(TPointList &inWayPoints);
  void FollowWaypointsMsgToYaml(nav2_msgs::action::FollowWaypoints::Goal &inMsg, YAML::Emitter &outYaml);
  void FollowWaypointsMsgToJson(nav2_msgs::action::FollowWaypoints::Goal &inMsg, std::string &outJson);

	rclcpp::Subscription<std_msgs::msg::String>::SharedPtr subscription_;
	rclcpp::Client<nav2_msgs::srv::LoadMap>::SharedPtr fLoadMapClient;

  boost::process::child fRosFollowWaypointAction;
  boost::process::ipstream fFollowWaypointsActionProcessStream;

	MessageInterchange *fMessageInterchange;
	boost::shared_ptr<boost::thread> fInterchangeThread;
	bool fRunThread;
	TPointListMap fPointLists;
};

#endif /* ROSINPUTCONNECTOR_HPP_ */
