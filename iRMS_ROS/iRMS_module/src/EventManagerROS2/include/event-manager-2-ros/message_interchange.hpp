#ifndef MESSAGE_INTERCHANGE_H
#define MESSAGE_INTERCHANGE_H
	
#include <boost/lockfree/policies.hpp>
#include <boost/lockfree/spsc_queue.hpp>
#include <string>

#define kMaxQueueLength 128

class MessageInterchange  
{
public:
	MessageInterchange();
	~MessageInterchange();

	bool SendMessageToROS(const std::string &inMessage);
	bool SendMessageToEA(const std::string &inMessage);

	bool GetNextMessageForROS(std::string &outMessage);
	bool GetNextMessageForEA(std::string &outMessage);
private:
	boost::lockfree::spsc_queue<std::string, boost::lockfree::capacity<kMaxQueueLength>> fToRosQueue;
	boost::lockfree::spsc_queue<std::string, boost::lockfree::capacity<kMaxQueueLength>> fFromRosQueue;
};
#endif