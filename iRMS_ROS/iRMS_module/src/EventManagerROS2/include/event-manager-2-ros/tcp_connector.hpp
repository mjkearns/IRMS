#ifndef TCP_CONNECTOR_H
#define TCP_CONNECTOR_H

#include <boost/shared_ptr.hpp>
#include <boost/enable_shared_from_this.hpp>
#include <boost/asio.hpp>
#include <boost/asio/ip/tcp.hpp>
#include <boost/asio/streambuf.hpp>
#include <boost/function.hpp>
#include <boost/bind/bind.hpp>
#include <boost/thread/recursive_mutex.hpp>
#include <string>

class TcpConnector: public std::enable_shared_from_this<TcpConnector>
{
public:
	boost::shared_ptr<TcpConnector> SharedFromThis();
	typedef boost::function<void(std::string &inBuffer, std::size_t &bytes_transferred, std::size_t &bytes_proccessed)> TBoostAsioHandler;

	TcpConnector(boost::asio::ip::tcp::socket inSocket);
	void Start();
	void RegisterCallbackHandlerReceivedData(TBoostAsioHandler inCallbackHandler);
	void RegisterCallbackHandlerSentData(TBoostAsioHandler inCallbackHandler);

private:
	void DoRead();
  	void DoWrite();

	void handleRead(boost::system::error_code ec, std::size_t length);

	boost::recursive_mutex fMutex;

	boost::asio::ip::tcp::socket fSocket;
	TBoostAsioHandler fReadHandler;
	TBoostAsioHandler fWriteHandler;
    boost::asio::streambuf fReadBuffer;
	boost::asio::streambuf fWriteBuffer;
};

#endif