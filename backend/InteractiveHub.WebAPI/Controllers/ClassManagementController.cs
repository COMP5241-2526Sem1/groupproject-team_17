using InteractiveHub.Service;
using InteractiveHub.Service.ClassManagement;
using InteractiveHub.WebAPI.DTO;
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

        [HttpGet("GetLeaderboard/{courseId}")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(HttpResult<LeaderboardResponseDto>))]
        [ProducesResponseType(StatusCodes.Status400BadRequest, Type = typeof(HttpResult))]
        [ProducesResponseType(StatusCodes.Status500InternalServerError, Type = typeof(HttpResult))]
        public async Task<IActionResult> GetLeaderboard(string courseId)
        {
            return await HandleWithResultAsync(async () =>
            {
                // 1. Get course with students
                var (courseRes, course) = await _classManager.GetCourseByIdAsync(courseId);
                if (courseRes.Code != ResCode.OK || course == null)
                {
                    return ReturnResponse(courseRes);
                }

                // 2. Get all activities for the course
                var (activitiesCode, activities) = await _classManager.GetCourseActivitiesAsync(courseId, activeOnly: false);
                if (activitiesCode != ResCode.OK)
                {
                    return ReturnResponse(new ServiceRes(activitiesCode, "Failed to fetch activities"));
                }

                var totalActivities = activities.Count;
                var students = course.Students ?? new List<Student>();

                // 3. Calculate leaderboard data for each student
                var leaderboardData = new List<LeaderboardStudentDto>();

                foreach (var student in students)
                {
                    int completedActivities = 0;
                    int totalQuizScore = 0;
                    int maxQuizScore = 0;

                    // Check each activity for student submissions
                    foreach (var activity in activities)
                    {
                        var (subCode, submissions) = await _classManager.GetActivitySubmissionsAsync(activity.Id);
                        if (subCode == ResCode.OK && submissions != null)
                        {
                            var studentSubmission = submissions.FirstOrDefault(s => s.StudentId == student.StudentId);

                            if (studentSubmission != null)
                            {
                                completedActivities++;

                                // Calculate quiz scores
                                if (activity.Type == ActivityType.Quiz && activity is Quiz quiz)
                                {
                                    var quizSubmission = studentSubmission as QuizSubmission;
                                    if (quizSubmission != null)
                                    {
                                        var questions = quiz.Questions;
                                        var answers = quizSubmission.Answers;

                                        for (int i = 0; i < questions.Count; i++)
                                        {
                                            var question = questions[i];
                                            if (i < answers.Count && answers[i] == question.CorrectAnswer)
                                            {
                                                totalQuizScore += question.Points;
                                            }
                                            maxQuizScore += question.Points;
                                        }
                                    }
                                }
                            }
                            else if (activity.Type == ActivityType.Quiz && activity is Quiz quizActivity)
                            {
                                // Count max score even if student didn't submit
                                maxQuizScore += quizActivity.Questions.Sum(q => q.Points);
                            }
                        }
                    }

                    var completionRate = totalActivities > 0 ? (double)completedActivities / totalActivities * 100 : 0;
                    var quizScorePercentage = maxQuizScore > 0 ? (double)totalQuizScore / maxQuizScore * 100 : 0;

                    leaderboardData.Add(new LeaderboardStudentDto
                    {
                        StudentId = student.StudentId,
                        StudentName = student.FullName,
                        Email = student.Email,
                        CompletedActivities = completedActivities,
                        TotalActivities = totalActivities,
                        CompletionRate = Math.Round(completionRate, 2),
                        TotalQuizScore = totalQuizScore,
                        MaxQuizScore = maxQuizScore,
                        QuizScorePercentage = Math.Round(quizScorePercentage, 2)
                    });
                }

                // 4. Sort by completion rate (desc), then by quiz score (desc)
                leaderboardData = leaderboardData
                    .OrderByDescending(s => s.CompletionRate)
                    .ThenByDescending(s => s.TotalQuizScore)
                    .ToList();

                // 5. Assign ranks
                for (int i = 0; i < leaderboardData.Count; i++)
                {
                    leaderboardData[i].Rank = i + 1;
                }

                var response = new LeaderboardResponseDto
                {
                    TotalActivities = totalActivities,
                    Students = leaderboardData
                };

                return ReturnOK(response);
            });
        }




    }








}
