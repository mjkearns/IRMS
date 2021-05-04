//============================================================================
// Name        : EventManagerROS2.cpp
// Author      :
// Version     :
// Copyright   :
// Description : Hello World in C++, Ansi-style
//============================================================================

#include <boost/program_options.hpp>
#include <boost/thread.hpp>
#include <string>
#include <cstdlib>
#include <signal.h>
#include <iostream>

#include "ea_connector.hpp"
#include "ros_connector.hpp"

namespace po = boost::program_options;

bool wait_for_quit()
{
	sigset_t signal_set;

	sigemptyset(&signal_set);
	sigaddset(&signal_set, SIGABRT);
	sigaddset(&signal_set, SIGINT);
	sigaddset(&signal_set, SIGTERM);
	sigaddset(&signal_set, SIGQUIT);

	int sig;
	int result = sigwait( &signal_set, &sig);
	return (!result);
}

int main(int argc, char* argv[]) {
	po::options_description desc("Allowed options");
	desc.add_options()
		("help", "produce help message")
		("listen_address", po::value<std::string>(), "set address to listen on")
		("listen_port", po::value<uint16_t>(), "set port to listen on")
		("ros_domain", po::value<std::string>(), "set ROS2 domain for RWM connection")
		("ros_address", po::value<std::string>(), "set address of ROS device");

	po::variables_map vm;
	po::store(po::parse_command_line(argc, argv, desc), vm);
	po::notify(vm);

	if (vm.count("help")) {
		std::cout << desc << "\n";
		return 1;
	}

	if (!vm.count("listen_address") || !vm.count("listen_port") || !vm.count("ros_address"))
	{
		std::cout << "listen_address, list_port and ros_address MUST be specified" << std::endl;
		return 1;
	}
	std::string aListenAddress = vm["listen_address"].as<std::string>();
	uint16_t aListenPort = vm["listen_port"].as<uint16_t>();

	std::string aRobotAddress = vm["ros_address"].as<std::string>();
	std::string aRosDomain = "0";
	if (vm.count("ros_domain"))
	{
		aRosDomain = vm["ros_domain"].as<std::string>();
	}

	if (setenv("ROS_DOMAIN", aRosDomain.c_str(), 0) == 0)
	{
		std::cout << "ROS_DOMAIN was set to " << aRosDomain << std::endl;
	}
	else
	{
		return 1;
	}

    rclcpp::init(argc, argv);
	MessageInterchange aMessageInterchange;
	RosConnector aRosConnector;
	std::cout << "Starting EA connection" << std::endl;
	boost::asio::io_context io_context;
	EAConnector aEventManagerConnector(io_context, aListenAddress, aListenPort, aRobotAddress);
	aEventManagerConnector.Start(&aMessageInterchange);
	boost::thread aThread([&]
	{
 		io_context.run();
	});

	std::cout << "Starting ROS connection" << std::endl;
	aRosConnector.Start(&aMessageInterchange);

    rclcpp::spin(aRosConnector.GetBaseNode());
	rclcpp::shutdown();

	std::cout << "Stopping" << std::endl;
	aEventManagerConnector.Stop();
	aThread.join();
	return 0;
}
