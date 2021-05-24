#include "message_interchange.hpp"
#include <iostream>

MessageInterchange::MessageInterchange()
{
}
	
MessageInterchange::~MessageInterchange()
{	
}

bool MessageInterchange::SendMessageToROS(const std::string &inMessage)
{
    if (inMessage.empty())
    {
        return true;
    }
    return fToRosQueue.push(inMessage);
}

bool MessageInterchange::SendMessageToEA(const std::string &inMessage)
{
    if (inMessage.empty())
    {
        return true;
    }
    return fFromRosQueue.push(inMessage);
}

bool MessageInterchange::GetNextMessageForROS(std::string &outMessage)
{
    return fToRosQueue.pop(outMessage);
}

bool MessageInterchange::GetNextMessageForEA(std::string &outMessage)
{
    return fFromRosQueue.pop(outMessage);
}

