/*
 * ea_connector.hpp
 *
 *  Created on: 6 Apr. 2021
 *      Author: chawksley
 */

#ifndef EA_CONNECTOR_HPP_
#define EA_CONNECTOR_HPP_

#include <string>
#include <message_interchange.hpp>
#include <tcp_connector.hpp>
#include <boost/asio/io_context.hpp>
#include <boost/asio/ip/tcp.hpp>
#include <boost/asio/placeholders.hpp>
#include <boost/asio/streambuf.hpp>
#include <boost/thread.hpp>
#include <boost/thread/recursive_mutex.hpp>
class EAConnector
{
public:
	EAConnector(boost::asio::io_context& io_context, const std::string &inAddress, const uint16_t &inPort, const std::string &inRobotAddress);
	virtual ~EAConnector();

	bool Start(MessageInterchange *inMessageInterchange);
	void Stop();

	void ProcessIncomingMessage(const std::string &inMessage);
	void ConvertMap();
	void DoAccept();
	void HandleAsyncRead(const std::string &inBuffer, const std::size_t &bytes_transferred, std::size_t &bytes_processed);
	void HandleAsyncWrite(const std::string &inBuffer, const std::size_t &bytes_transferred, std::size_t &bytes_processed);
private:
	bool FindXml(const std::string &inBuffer, std::size_t &outStart, std::size_t &outEnd);
	std::string ConvertToJson(const std::string inXmlString);
	std::string fAddress;
	uint16_t fPort;
	std::string fRobotAddress;

	MessageInterchange *fMessageInterchange;
    boost::asio::ip::tcp::acceptor fTcpAcceptor;
	boost::recursive_mutex fMutex;
};

#endif /* EA_CONNECTOR_HPP_ */
