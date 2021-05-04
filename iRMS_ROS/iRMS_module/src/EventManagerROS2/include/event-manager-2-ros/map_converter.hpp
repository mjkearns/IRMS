/*
 * format_convertor.hpp
 *
 *  Created on: 6 Apr. 2021
 *      Author: chawksley
 */

#ifndef MAP_CONVERTER_HPP_
#define MAP_CONVERTER_HPP_
#include <string>
#include <pugixml.hpp>
#include <cmath>

class MapConverter
{
public:
	typedef struct SMapInfo
	{
		double_t origin_x;
		double_t origin_y;
		double_t rotation;
		double_t width;
		double_t height;
		double_t scale;
	} TMapInfo;

	MapConverter();
	virtual ~MapConverter();

	bool ConvertToRos(const std::string &inDestinationAddress, const std::string &inMapSvg, const std::string &inMapName, std::string &outMetaDataPath);
private:
	bool LoadXML(const std::string &inMapSvg, pugi::xml_document &outXmlDocument);
	bool ExtractMetadata(pugi::xml_document &inXmlDocument, const std::string &inMapName, std::string &outMetadataFilePath, TMapInfo &outMapInfo);
	bool CreateCostmap(pugi::xml_document &inXmlDocument, const std::string &inMapName, const TMapInfo &inMapInfo, std::string &outMapFilePath);
	void ProcessPolygon(const pugi::xml_node &inPolygonNode, unsigned char *inBuffer, const uint32_t &inRows, const uint32_t &inColumns, const double_t &inScale);
	void RasterizeSegment(unsigned char *inBuffer, const uint16_t rows, const uint16_t cols, const double x1, const double y1, const double x2, const double y2);
	bool WriteMapToFile(const std::string &inFileName, const unsigned char *inBuffer, const uint16_t rows, const uint16_t cols);
	bool FtpFiles(const std::string &inFtpAddress, const std::string &inMapPath,const std::string &inMetdataPath, std::string &outUploadedMetadataPath);
	void CreateTempDirectory();
	double_t fResolution;
	double_t fThresholdLow;
	double_t fThresholdHigh;
	std::string fOutputDir;
};

#endif /* MAP_CONVERTER_HPP_ */
