cmake_minimum_required(VERSION 3.5)
project(event-manager-2-ros)

# Default to C99
if(NOT CMAKE_C_STANDARD)
  set(CMAKE_C_STANDARD 99)
endif()

# Default to C++14
if(NOT CMAKE_CXX_STANDARD)
  set(CMAKE_CXX_STANDARD 14)
endif()

if(CMAKE_COMPILER_IS_GNUCXX OR CMAKE_CXX_COMPILER_ID MATCHES "Clang")
  add_compile_options(-Wall -Wextra -Wpedantic)
endif()

# find dependencies
find_package(ament_cmake REQUIRED)
find_package(rclcpp REQUIRED)
find_package(rclcpp_action)
find_package(std_msgs REQUIRED)
find_package(geometry_msgs REQUIRED)
find_package(nav2_msgs REQUIRED)
find_package(nav2_util REQUIRED)
find_package(nav2_lifecycle_manager REQUIRED)

set(SRCS
  src/map_converter.cpp
  src/ea_connector.cpp
  src/ros_connector.cpp
  src/tcp_connector.cpp
  src/message_interchange.cpp
  src/main.cpp
)

set(LIBS
${CMAKE_SOURCE_DIR}/3rdparty/lib/libboost_program_options.a
${CMAKE_SOURCE_DIR}/3rdparty/lib/libboost_thread.a
${CMAKE_SOURCE_DIR}/3rdparty/lib/libboost_system.a
${CMAKE_SOURCE_DIR}/3rdparty/lib/libboost_filesystem.a
${CMAKE_SOURCE_DIR}/3rdparty/lib/libyaml-cpp.a
${CMAKE_SOURCE_DIR}/3rdparty/lib/libpugixml.a
${CMAKE_SOURCE_DIR}/3rdparty/lib/libPocoNet.a
${CMAKE_SOURCE_DIR}/3rdparty/lib/libPocoUtil.a
${CMAKE_SOURCE_DIR}/3rdparty/lib/libPocoEncodings.a
${CMAKE_SOURCE_DIR}/3rdparty/lib/libPocoFoundation.a
)

add_executable(${PROJECT_NAME}_node ${SRCS})

include_directories(include/${PROJECT_NAME} 3rdparty/include)
target_link_libraries(${PROJECT_NAME}_node ${LIBS} pthread)

ament_target_dependencies(${PROJECT_NAME}_node
rclcpp
rclcpp_action
geometry_msgs
std_msgs
nav2_msgs
nav2_lifecycle_manager
nav2_util)

install(TARGETS ${PROJECT_NAME}_node DESTINATION lib/${PROJECT_NAME})

if(BUILD_TESTING)
  find_package(ament_lint_auto REQUIRED)
  # the following line skips the linter which checks for copyrights
  # uncomment the line when a copyright and license is not present in all source files
  #set(ament_cmake_copyright_FOUND TRUE)
  # the following line skips cpplint (only works in a git repo)
  # uncomment the line when this package is not in a git repo
  #set(ament_cmake_cpplint_FOUND TRUE)
  ament_lint_auto_find_test_dependencies()
endif()

ament_package()
