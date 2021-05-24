/*
 * ea_connector.cpp
 *
 *  Created on: 6 Apr. 2021
 *      Author: chawksley
 */

#include <boost/asio.hpp>
#include <string>
#include "ea_connector.hpp"
#include "map_converter.hpp"
#include <iostream>
#include <sstream>
#include <fstream>
#include <boost/asio/ip/tcp.hpp>
#include <boost/bind/bind.hpp>
#include <boost/thread/lock_guard.hpp>
#include <xml2json.hpp>


EAConnector::EAConnector(boost::asio::io_context& io_context, const std::string &inAddress, const uint16_t &inPort, const std::string &inRobotAddress) :
   fAddress(inAddress)
  ,fPort(inPort)
  ,fRobotAddress(inRobotAddress)
  ,fTcpAcceptor(io_context, boost::asio::ip::tcp::endpoint(boost::asio::ip::address::from_string(inAddress), inPort))
{
}

EAConnector::~EAConnector()
{
}

bool EAConnector::Start(MessageInterchange *inMessageInterchange)
{
	fMessageInterchange = inMessageInterchange;
	DoAccept();

	return true;
}

void EAConnector::DoAccept()
{
	fTcpAcceptor.async_accept(
		[this](boost::system::error_code ec, boost::asio::ip::tcp::socket socket)
		{
			if (!ec)
			{
				std::shared_ptr<TcpConnector> aConnector = std::make_shared<TcpConnector>(std::move(socket));
				aConnector->RegisterCallbackHandlerReceivedData(boost::bind(&EAConnector::HandleAsyncRead, this, boost::placeholders::_1, boost::placeholders::_2, boost::placeholders::_3));
				aConnector->RegisterCallbackHandlerSentData(boost::bind(&EAConnector::HandleAsyncWrite, this, boost::placeholders::_1, boost::placeholders::_2, boost::placeholders::_3));
				aConnector->Start();
			}
 			else 
          	{
            	std::cout << ec.message() << std::endl;
			}
       		DoAccept();
		}
	);
}

void EAConnector::ConvertMap()
{
	MapConverter aConverter;
	std::string aMapPath = "/home/chawksley/aros-ROBOT-DEMO/RangeData/Infantry/Maps/9999_runtime_map.svg";
	std::string aMapName = "test_map_9999";

	std::ifstream aFileStream(aMapPath);
	if (aFileStream.is_open())
	{
		std::stringstream aMapSvg;
		aMapSvg << aFileStream.rdbuf();
		std::string aOutputMetaDataPath;
		aConverter.ConvertToRos(fRobotAddress, aMapSvg.str(), aMapName, aOutputMetaDataPath);
		aFileStream.close();
//		fRosConnector->SendLoadMapMessage(aOutputMetaDataPath);
	}
}

bool EAConnector::FindXml(const std::string &inBuffer, std::size_t &outStart, std::size_t &outEnd)
{
	outEnd = 0;
	outStart = 0;
	
	std::size_t aStart = inBuffer.find("<robot");
	if (aStart != std::string::npos)
	{
		std::size_t aEnd = inBuffer.find("</robot>");
		if (aEnd != std::string::npos)
		{
			aEnd += strlen("</robot>");
			outStart = aStart;
			outEnd = aEnd - 1;
		}
	}

	return (outEnd != 0);
}

std::string EAConnector::ConvertToJson(const std::string inXmlString)
{
	std::string aReturn = "";
	try {
		aReturn = xml2json(inXmlString.c_str());
	}
	catch(std::exception &e)
	{
		std::cerr << "Processing XML " << inXmlString << " : " << e.what() << std::endl;
	}
	return aReturn;
}

void EAConnector::HandleAsyncRead(const std::string &inBuffer, const std::size_t &bytes_transferred, std::size_t &bytes_processed)
{
	bytes_processed = 0;
	std::size_t aStart, aEnd;
	if (FindXml(inBuffer, aStart, aEnd))
	{
		std::string aXmlString = inBuffer.substr(aStart, aEnd);
		ProcessIncomingMessage(aXmlString);
		bytes_processed = aEnd;
	}
}

void EAConnector::HandleAsyncWrite(const std::string &inBuffer, const std::size_t &bytes_transferred, std::size_t &bytes_processed)
{
}

void EAConnector::ProcessIncomingMessage(const std::string &inMessage)
{
	if (fMessageInterchange->SendMessageToROS(ConvertToJson(inMessage)))
	{
		std::cout << "to ROS:" << inMessage << std::endl;
	};
}

void EAConnector::Stop()
{
	{
		boost::lock_guard<boost::recursive_mutex> aLock(fMutex);
	}
}

