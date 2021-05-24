/*
 * format_convertor.cpp
 *
 *  Created on: 6 Apr. 2021
 *      Author: chawksley
 */


#include "map_converter.hpp"

#include <pugixml.hpp>
#include <yaml-cpp/yaml.h>
#include <iostream>
#include <sstream>
#include <fstream>
#include <cmath>
#include <boost/algorithm/string.hpp>
#include <boost/lexical_cast.hpp>
#include <cstdio>
#include <cstdlib>
#include <Poco/Net/FTPClientSession.h>
#include <Poco/Path.h>
#include <Poco/FileStream.h>
#include <limits.h>

MapConverter::MapConverter() : fResolution(0.2), fThresholdLow(0.2), fThresholdHigh(0.65), fOutputDir("/tmp/")
{
}

MapConverter::~MapConverter()
{
}

bool MapConverter::LoadXML(const std::string &inMapSvg, pugi::xml_document &outXmlDocument)
{
	if (!outXmlDocument.load_string(inMapSvg.c_str()))
	{
		std::cout << "MapConverter::ConvertToRos : Error in XML document" << std::endl;
		return false;
	}
	return true;
}

bool MapConverter::ExtractMetadata(pugi::xml_document &inXmlDocument, const std::string &inMapName, std::string &outMetadataFilePath, TMapInfo &outMapInfo)
{
	std::string aImageFile = inMapName + ".pgm";
	double_t aResolution = fResolution;
	double_t aOccupiedThreshold = fThresholdHigh;
	double_t aFreeThreshold = fThresholdLow;

	pugi::xpath_node aXpathNode = inXmlDocument.select_node("/svg");
	if (!aXpathNode)
	{
		return false;
	}

	pugi::xml_node aSvgNode = aXpathNode.node();

	outMapInfo.width = aSvgNode.attribute("map:width").as_double();
	outMapInfo.height = aSvgNode.attribute("map:height").as_double();
	outMapInfo.scale = 1000.0 / aSvgNode.attribute("map:unitscale").as_double();
	double_t north_x = aSvgNode.attribute("map:northx").as_double();
	double_t north_y = aSvgNode.attribute("map:northy").as_double();
	outMapInfo.origin_x = aSvgNode.attribute("map:gpsx").as_double();
	outMapInfo.origin_y = aSvgNode.attribute("map:gpsy").as_double();

	north_x -= outMapInfo.origin_x;
	north_y -= outMapInfo.origin_y;
	outMapInfo.rotation = atan(north_x / north_y);

	YAML::Emitter aMetadata;
	aMetadata << YAML::BeginMap;
	aMetadata << YAML::Key << "image";
	aMetadata << YAML::Value << aImageFile;

	aMetadata << YAML::Key << "resolution";
	aMetadata << YAML::Value << aResolution;

	aMetadata << YAML::Key << "occupied_thresh";
	aMetadata << YAML::Value << aOccupiedThreshold;

	aMetadata << YAML::Key << "free_thresh";
	aMetadata << YAML::Value << aFreeThreshold;

	aMetadata << YAML::Key << "negate";
	aMetadata << YAML::Value << 0;

	aMetadata << YAML::Key << "origin";
	aMetadata << YAML::Value << YAML::BeginSeq << outMapInfo.origin_x << outMapInfo.origin_y << outMapInfo.rotation << YAML::EndSeq;
	aMetadata << YAML::EndMap;

	//TODO create file
	std::stringstream aStrStr;
	aStrStr << fOutputDir << "/" << inMapName << ".yaml";
	outMetadataFilePath = aStrStr.str();
	std::ofstream aFileStream(outMetadataFilePath.c_str());
	aFileStream << aMetadata.c_str();
	aFileStream.close();


	return true;
}

bool MapConverter::CreateCostmap(pugi::xml_document &inXmlDocument, const std::string &inMapName, const TMapInfo &inMapInfo, std::string &outMapFilePath)
{
	uint32_t rows = ceil(inMapInfo.height * inMapInfo.scale / fResolution);
	uint32_t columns = ceil(inMapInfo.width * inMapInfo.scale / fResolution);
	double_t aScale = inMapInfo.scale / fResolution;

	if (!rows || !columns)
	{
		return false;
	}

	unsigned char *buffer;
	try {
		buffer = new unsigned char[rows * columns];
		memset(buffer, 0xff, rows * columns);
	} catch(std::exception &e) {
		return false;
	}

	pugi::xpath_node_set aXpathNodes = inXmlDocument.select_nodes("//polygon");
	for (pugi::xpath_node_set::iterator aIter = aXpathNodes.begin(); aIter != aXpathNodes.end(); aIter++)
	{
		pugi::xml_node aNode = aIter->node();
		std::string aZoneType = aNode.attribute("map:type").as_string();
		if (aZoneType == "nogo" || aZoneType == "boundary")
		{
			ProcessPolygon(aNode, buffer, rows, columns, aScale);
		}
	}
	std::stringstream aStrStr;
	aStrStr << fOutputDir << "/" << inMapName << ".pgm";
	outMapFilePath = aStrStr.str();
	bool result = WriteMapToFile(outMapFilePath, buffer, rows, columns);

	delete[] buffer;
	return result;
}

void MapConverter::ProcessPolygon(const pugi::xml_node &inPolygonNode, unsigned char *inBuffer, const uint32_t &inRows, const uint32_t &inColumns, const double_t &inScale)
{
	std::string aPolygonString = inPolygonNode.attribute("points").as_string();
	if (aPolygonString.empty())
	{
		return;
	}
	std::vector<std::string> aTokens;
	boost::split(aTokens, aPolygonString, boost::is_any_of(" ,"), boost::token_compress_on);
	double_t last_x = 0, last_y = 0;
	double_t first_x = 0, first_y = 0;
	bool first_pass = true;
	for (size_t i = 0; i < aTokens.size() - 1; i += 2)
	{
		double_t x = boost::lexical_cast<double_t>(aTokens[i]);
		double_t y = boost::lexical_cast<double_t>(aTokens[i+1]);
		if (first_pass)
		{
			first_pass = false;
			first_x = x;
			first_y = y;
		}
		else
		{
			uint32_t x1 = round(last_x * inScale);
			uint32_t y1 = round(last_y * inScale);
			uint32_t x2 = round(x * inScale);
			uint32_t y2 = round(y * inScale);
			RasterizeSegment(inBuffer, inRows, inColumns, x1, y1, x2, y2);
		}
		last_x = x;
		last_y = y;
	}
	// Close the polygon if necessary
	if (last_x != first_x || last_y != first_y)
	{
		uint32_t x1 = round(last_x * inScale);
		uint32_t y1 = round(last_y * inScale);
		uint32_t x2 = round(first_x * inScale);
		uint32_t y2 = round(first_y * inScale);
		RasterizeSegment(inBuffer, inRows, inColumns, x1, y1, x2, y2);
	}
}

void PlotPixel(const int inX, const int inY, const unsigned char value, unsigned char *inBuffer, const uint16_t max_x, const uint16_t max_y)
{
	//min-max
	uint16_t x = (inX < 0 ? 0 : inX);
	x = (x >= max_x ? max_x -1 : x);
	uint16_t y = (inY < 0 ? 0 : inY);
	y = (y >= max_y ? max_y -1 : y);

	uint64_t offset = x + (max_x * y);
	*(inBuffer + offset) = value;
}

void MapConverter::RasterizeSegment(unsigned char *inBuffer, const uint16_t rows, const uint16_t cols, const double x1, const double y1, const double x2, const double y2)
{
	//DDA algorithm
	double_t x, y, dx ,dy ,step;
	dx = (x2 - x1);
	dy = (y2 - y1);
	if (abs(dx) >= abs(dy))
		step = abs(dx);
	else
		step = abs(dy);
	dx = dx / step;
	dy = dy / step;
	x = x1;
	y = y1;
	uint16_t i = 1;
	while (i <= step) {
		PlotPixel(round(x), round(y), ceil(fThresholdLow * 0xFF), inBuffer, cols, rows);
		x += dx;
		y += dy;
		i++;
	}
}

bool MapConverter::WriteMapToFile(const std::string &inFileName, const unsigned char *inBuffer, const uint16_t rows, const uint16_t cols)
{

	std::ofstream aFileStream(inFileName.c_str());

	if (aFileStream.is_open())
	{
		aFileStream << "P5\n" << cols << " " << rows <<"\n255\n";
		for (uint16_t j = rows; j > 0; j--)
		{
			for (uint16_t i = 0; i < cols; i++)
			{
				uint64_t offset = i + (j * cols);
				unsigned char aCharVal = *(inBuffer + offset);
				aFileStream << aCharVal;
			}
		}
		aFileStream.close();
		return true;
	}
	else
	{
		return false;
	}
}

bool MapConverter::FtpFiles(const std::string &inFtpAddress, const std::string &inMapPath,const std::string &inMetdataPath, std::string &outUploadedMetadataPath)
{
	try
	{
		Poco::Net::FTPClientSession aFtpClient(inFtpAddress, Poco::Net::FTPClientSession::FTP_PORT, "ftp", "");
		if (aFtpClient.isLoggedIn())
		{
			Poco::Path aMapFileName(inMapPath);
			Poco::FileInputStream aMapInStream(inMapPath);
			std::ostream& aMapOutStream = aFtpClient.beginUpload(aMapFileName.getFileName());
			aMapOutStream << aMapInStream.rdbuf();
			aFtpClient.endUpload();

			Poco::Path aMetaFileName(inMetdataPath);
			Poco::FileInputStream aMetaInStream(inMetdataPath);
			std::ostream& aMetaOutStream = aFtpClient.beginUpload(aMetaFileName.getFileName());
			aMetaOutStream << aMetaInStream.rdbuf();
			aFtpClient.endUpload();

			outUploadedMetadataPath = aMetaFileName.getFileName();
			return true;

		}
	}
	catch (Poco::Exception &e)
	{
		std::cout << e.displayText() << std::endl;
	}
	return false;
}

void MapConverter::CreateTempDirectory()
{
	const char * const tmplt = "/tmp/map_converter-XXXXXX";
	char buffer[PATH_MAX] = {0};
	strncpy(buffer, tmplt, strlen(tmplt));
	auto result = mkdtemp(buffer);

	fOutputDir = result;
}

bool MapConverter::ConvertToRos(const std::string &inDestinationAddress, const std::string &inMapSvg, const std::string &inMapName, std::string &outMetaDataPath)
{
	pugi::xml_document aDocument;

	if (LoadXML(inMapSvg, aDocument))
	{
		std::string aMetadataPath;
		std::string aOutputPath;
		TMapInfo aMapInfo;
		if (ExtractMetadata(aDocument, inMapName, aMetadataPath, aMapInfo))
		{
			if (CreateCostmap(aDocument, inMapName, aMapInfo, aOutputPath))
			{
				std::string aUploadedFilePath;
				if (FtpFiles(inDestinationAddress, aOutputPath, aMetadataPath, aUploadedFilePath))
				{
					std::remove(aOutputPath.c_str());
					std::remove(aMetadataPath.c_str());
					outMetaDataPath = aUploadedFilePath;
					return true;
				}
			}
		}
	}

	return false;
}
