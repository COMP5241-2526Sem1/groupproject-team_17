using InteractiveHub.Service;
using InteractiveHub.Service.ClassManagement;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace InteractiveHub.WebAPI.Controllers
{
    [Authorize]
    [Route("api/Course")]
    [ApiController]
    public partial class ClassManagementController : IHControllerBase
    {
        private readonly IClassManager _classManager;

        public ClassManagementController(IClassManager classManager, IHubLogger logger) : base(logger)
        {
            _classManager = classManager;
        }
    }

    public partial class ClassManagementController
    {
        [HttpGet("GetCourse/{courseId}")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(HttpResult<TeachingCourseDto>))]
        [ProducesResponseType(StatusCodes.Status400BadRequest, Type = typeof(HttpResult))]
        [ProducesResponseType(StatusCodes.Status500InternalServerError, Type = typeof(HttpResult))]
        public async Task<IActionResult> GetCourse(string courseId)
        {
            return await HandleWithResultAsync(async () =>
            {
                (ServiceRes res, TeachingCourse? teachingCourse) result = await _classManager.GetCourseByIdAsync(courseId);

                if (result.res.Code != ResCode.OK)
                {
                    return ReturnResponse(result.res);
                }
                var courseDto = result.teachingCourse?.ToDto();
                return ReturnOK(courseDto);
            });
        }
        [HttpGet("GetAllCourses")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(HttpResult<IEnumerable<TeachingCourse>>))]
        [ProducesResponseType(StatusCodes.Status400BadRequest, Type = typeof(HttpResult))]
        [ProducesResponseType(StatusCodes.Status500InternalServerError, Type = typeof(HttpResult))]
        public async Task<IActionResult> GetAllCourses()
        {
            return await HandleWithResultAsync(async () =>
            {
                (ServiceRes res, IEnumerable<TeachingCourse> teachingCourses) result = await _classManager.GetAllCoursesAsync();
                if (result.res.Code != ResCode.OK)
                {
                    return ReturnResponse(result.res);
                }

                var courses = result.teachingCourses.Select(c => c.ToDto());
                return ReturnOK(courses);
            });
        }
        [HttpPost("CreateCourse")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(HttpResult))]
        [ProducesResponseType(StatusCodes.Status400BadRequest, Type = typeof(HttpResult))]
        [ProducesResponseType(StatusCodes.Status500InternalServerError, Type = typeof(HttpResult))]
        public async Task<IActionResult> CreateCourse([FromBody] CreateCourseRequest request)
        {
            return await HandleWithResultAsync(async () =>
            {
                ServiceRes res = await _classManager.CreateCourseAsync(request);
                if (res.Code != ResCode.OK)
                {
                    return ReturnResponse(res);
                }
                return ReturnOK(null, "Course created successfully.");
            });
        }

        [HttpPut("UpdateCourse/{courseId}")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(HttpResult))]
        [ProducesResponseType(StatusCodes.Status400BadRequest, Type = typeof(HttpResult))]
        [ProducesResponseType(StatusCodes.Status500InternalServerError, Type = typeof(HttpResult))]
        public async Task<IActionResult> UpdateCourse(string courseId, [FromBody] UpdateCourseRequest request)
        {
            return await HandleWithResultAsync(async () =>
            {
                ServiceRes res = await _classManager.UpdateCourseAsync(request, courseId);
                if (res.Code != ResCode.OK)
                {
                    return ReturnResponse(res);
                }
                return ReturnOK(null, "Course updated successfully.");
            });
        }


        [HttpDelete("DeleteCourse/{courseId}")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(HttpResult))]
        [ProducesResponseType(StatusCodes.Status400BadRequest, Type = typeof(HttpResult))]
        [ProducesResponseType(StatusCodes.Status500InternalServerError, Type = typeof(HttpResult))]
        public async Task<IActionResult> DeleteCourse(string courseId)
        {
            return await HandleWithResultAsync(async () =>
            {
                ServiceRes res = await _classManager.DeleteCourseAsync(courseId);
                if (res.Code != ResCode.OK)
                {
                    return ReturnResponse(res);
                }
                return ReturnOK(null, "Course deleted successfully.");
            });
        }

        [HttpPost("AddOrUpdateStudents/{courseId}")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(HttpResult))]
        [ProducesResponseType(StatusCodes.Status400BadRequest, Type = typeof(HttpResult))]
        [ProducesResponseType(StatusCodes.Status500InternalServerError, Type = typeof(HttpResult))]
        public async Task<IActionResult> AddOrUpdateStudents(string courseId, [FromBody] IEnumerable<CreateStudentDto> students)
        {
            return await HandleWithResultAsync(async () =>
            {
                ServiceRes res = await _classManager.CreateOrUpdateStudentToCourse(students, courseId);
                if (res.Code != ResCode.OK)
                {
                    return ReturnResponse(res);
                }
                return ReturnOK(null, "Students added/updated successfully.");
            });
        }

        [HttpDelete("{courseId}/RemoveStudent/{studentId}")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(HttpResult))]
        [ProducesResponseType(StatusCodes.Status400BadRequest, Type = typeof(HttpResult))]
        [ProducesResponseType(StatusCodes.Status500InternalServerError, Type = typeof(HttpResult))]
        public async Task<IActionResult> RemoveStudent(string courseId, string studentId)
        {
            return await HandleWithResultAsync(async () =>
            {
                ServiceRes res = await _classManager.RemoveStudentsFromCourseAsync(new[] { studentId }, courseId);
                if (res.Code != ResCode.OK)
                {
                    return ReturnResponse(res);
                }
                return ReturnOK(null, "Student removed successfully.");
            });
        }

        [HttpDelete("{courseId}/RemoveStudents")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(HttpResult))]
        [ProducesResponseType(StatusCodes.Status400BadRequest, Type = typeof(HttpResult))]
        [ProducesResponseType(StatusCodes.Status500InternalServerError, Type = typeof(HttpResult))]
        public async Task<IActionResult> RemoveStudents(string courseId, [FromBody] IEnumerable<string> studentIds)
        {
            return await HandleWithResultAsync(async () =>
            {
                ServiceRes res = await _classManager.RemoveStudentsFromCourseAsync(studentIds, courseId);
                if (res.Code != ResCode.OK)
                {
                    return ReturnResponse(res);
                }
                return ReturnOK(null, "Students removed successfully.");
            });
        }




    }








}
