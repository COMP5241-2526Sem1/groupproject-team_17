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
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(HttpResult<TeachingCourse>))]
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
                return ReturnOK(result.teachingCourse);
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
                return ReturnOK(result.teachingCourses);
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

    }








}
