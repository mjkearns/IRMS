#include <tcp_connector.hpp>
#include <iostream>
#include <sstream>
#include <algorithm>
#include <iterator>
#include <boost/bind/bind.hpp>
#include <boost/thread/lock_guard.hpp>


TcpConnector::TcpConnector(boost::asio::ip::tcp::socket inSocket) : 
fSocket(std::move(inSocket))
{
}

void TcpConnector::Start()
{
    DoRead();
}

void TcpConnector::DoRead()
{
    auto self(shared_from_this());
    fSocket.async_read_some(fReadBuffer.prepare(1024), boost::bind(&TcpConnector::handleRead, self, boost::placeholders::_1, boost::placeholders::_2));
}

void TcpConnector::handleRead(boost::system::error_code ec, std::size_t length)
{
    if (!ec)
    {
        fReadBuffer.commit(length);

        // get const buffer
        std::stringstream ssOut;
        boost::asio::streambuf::const_buffers_type constBuffer = fReadBuffer.data();

        size_t nBufferSize = boost::asio::buffer_size(fReadBuffer.data());
        // copy const buffer to stringstream, then output
        std::copy(
            boost::asio::buffers_begin(constBuffer),
            boost::asio::buffers_begin(constBuffer) + nBufferSize,
            std::ostream_iterator<char>(ssOut));
        if (fReadHandler)
        {            
            std::string aString = ssOut.str();
            size_t aBytesProcessed = 0;
            fReadHandler(aString, length, aBytesProcessed);
            if (aBytesProcessed)
            {
                fReadBuffer.consume(aBytesProcessed);
            }
        }
    }
    else
    {
        std::cout << ec.message() << std::endl;
    }
    DoRead();
}

void TcpConnector::DoWrite()
{
    auto self(shared_from_this());
    boost::asio::async_write(fSocket, fReadBuffer.data(), [this, self](boost::system::error_code ec, std::size_t length)
        {
          if (!ec)
          {
//            fWriteHandler(fWriteBuffer.data(), length);
          }
        }
    );
}

void TcpConnector::RegisterCallbackHandlerReceivedData(TBoostAsioHandler inCallbackHandler)
{
	boost::lock_guard<boost::recursive_mutex> aLock(fMutex);

	fReadHandler = inCallbackHandler;
}

void TcpConnector::RegisterCallbackHandlerSentData(TBoostAsioHandler inCallbackHandler)
{
	boost::lock_guard<boost::recursive_mutex> aLock(fMutex);

	fWriteHandler = inCallbackHandler;
}
