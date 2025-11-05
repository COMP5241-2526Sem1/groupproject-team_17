using System;
using InteractiveHub.Service.Shared.Extensions;
using Microsoft.EntityFrameworkCore;
using Org.BouncyCastle.Ocsp;


namespace InteractiveHub.Service.ClassManagement;

public partial class ClassManager
{


    public async Task<ServiceRes> CreateCourseAsync(CreateCourseRequest request)
    {

        if (string.IsNullOrWhiteSpace(OwnerId))
        {
            return ServiceRes.Unauthorized(ResCode.OwnerIdMissing, "Operation attempted without valid owner.");
        }

        if (request == null)
        {
            return ServiceRes.BadRequest(ResCode.InvalidCourseData, "Invalid course data.");
        }

        if (!request.CheckNotNull(out var missingField))
        {
            _log?.LogError($"CreateCourseAsync: Missing required field [{missingField}].", Operator: OwnerId);
            return ServiceRes.BadRequest(ResCode.CourseRequiredFieldMissing, $"Missing required field [{missingField}].");
        }

        // Generate a well-dispersed random 6-digit join code (100000 to 999999)
        // Using Random.Shared for better distribution
        long joinCode;
        int maxAttempts = 10;
        int attempts = 0;

        do
        {
            joinCode = Random.Shared.NextInt64(100000, 1000000);
            attempts++;
        }
        while (await db.Courses.AnyAsync(c => c.JoinCode == joinCode && c.OwnerId == OwnerId) && attempts < maxAttempts);

        // Fallback: if still collision after max attempts, find next available code
        if (await db.Courses.AnyAsync(c => c.JoinCode == joinCode && c.OwnerId == OwnerId))
        {
            var maxJoinCode = await db.Courses
                .Where(c => c.OwnerId == OwnerId)
                .MaxAsync(c => (long?)c.JoinCode) ?? 100000;
            joinCode = maxJoinCode + 1;
        }

        var course = new TeachingCourse();
        course.CopyFrom(request);
        course.OwnerId = OwnerId;
        course.JoinCode = joinCode;
        try
        {
            var existing = await db.Courses.FirstOrDefaultAsync(c => c.CourseCode == course.CourseCode
                && c.OwnerId == OwnerId
                && c.AcademicYear == course.AcademicYear
                && c.Semester == course.Semester);
            if (existing != null)
            {
                _log?.LogError($"CreateCourseAsync: Course {course.CourseCode} in {course.AcademicYear} Semester {course.Semester} already exists.", Operator: OwnerId);
                return ServiceRes.Conflict(ResCode.CourseAlreadyExists, $"Course {course.CourseCode} in {course.AcademicYear} Semester {course.Semester} already exists.");
                // return new ServiceRes(ResCode.CourseAlreadyExists, $"Course with code [{course.CourseCode} in {course.AcademicYear} Semester{course.Semester}] already exists.", traceId: _log?.TraceId);
            }

            db.Courses.Add(course);
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException dbEx)
        {
            _log?.LogError("CreateCourseAsync: Database error occurred while creating course.", Operator: OwnerId, ex: dbEx);
            return ServiceRes.InternalError(ResCode.DatabaseError, "Unexpected error.", traceId: _log?.TraceId);
        }
        catch (Exception ex)
        {
            _log?.LogError("CreateCourseAsync: An unexpected error occurred while creating course.", Operator: OwnerId, ex: ex);
            return ServiceRes.InternalError(ResCode.DatabaseError, "An unexpected error occurred while creating the course.", traceId: _log?.TraceId);
        }

        return ServiceRes.OK();

    }
    public async Task<ServiceRes> UpdateCourseAsync(UpdateCourseRequest request, string courseId)
    {
        if (string.IsNullOrWhiteSpace(OwnerId))
        {
            return ServiceRes.Unauthorized(ResCode.OwnerIdMissing, "Operation attempted without valid owner.");
        }

        if (string.IsNullOrWhiteSpace(courseId))
        {
            return ServiceRes.BadRequest(ResCode.InvalidCourseData, "Invalid course ID.");
        }
        if (request == null)
        {
            return ServiceRes.BadRequest(ResCode.InvalidCourseData, "Invalid course ID.");
        }

        if (!request.CheckNotNull(out var missingField))
        {
            _log?.LogError($"UpdateCourseAsync: Missing required field [{missingField}].", Operator: OwnerId);
            return ServiceRes.BadRequest(ResCode.CourseRequiredFieldMissing, $"Missing required field [{missingField}].");
        }

        try
        {

            var existingCourse = await GetCachedCourse(courseId, OwnerId);
            if (existingCourse == null)
            {
                _log?.LogError($"UpdateCourseAsync: Course with ID [{courseId}] not found.", Operator: OwnerId);
                return ServiceRes.NotFound(ResCode.CourseNotFound, $"Course not found.", traceId: _log?.TraceId);
            }
            var existingFromOther = await db.Courses.FirstOrDefaultAsync(c => c.CourseCode == request.CourseCode
                      && c.OwnerId == OwnerId
                      && c.AcademicYear == request.AcademicYear
                      && c.Semester == request.Semester
                      && c.Id != courseId); // Check other existing courses
            if (existingFromOther != null)
            {

                _log?.LogError($"UpdateCourseAsync: Course {request.CourseCode} in {request.AcademicYear} Semester {request.Semester} already exists.", Operator: OwnerId);
                return ServiceRes.Conflict(ResCode.CourseAlreadyExists, $"Course with code {request.CourseCode} in {request.AcademicYear} Semester {request.Semester} already exists.", traceId: _log?.TraceId);

            }

            existingCourse.CopyFrom(request);
            db.Courses.Update(existingCourse);
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException dbEx)
        {
            _log?.LogError("UpdateCourseAsync: Database error occurred while updating course.", Operator: OwnerId, ex: dbEx);
            return ServiceRes.InternalError(ResCode.DatabaseError, "Unexpected error.", traceId: _log?.TraceId);
        }
        catch (Exception ex)
        {
            _log?.LogError("UpdateCourseAsync: An unexpected error occurred while updating course.", Operator: OwnerId, ex: ex);
            return ServiceRes.InternalError(ResCode.DatabaseError, "An unexpected error occurred while updating the course.", traceId: _log?.TraceId);
        }

        return ServiceRes.OK();

    }
    public async Task<ServiceRes> DeleteCourseAsync(string courseId)
    {


        if (string.IsNullOrWhiteSpace(OwnerId))
        {
            return ServiceRes.Unauthorized(ResCode.OwnerIdMissing, "Operation attempted without valid owner.");
        }

        if (string.IsNullOrWhiteSpace(courseId))
        {
            return ServiceRes.BadRequest(ResCode.InvalidCourseData, "Invalid course ID.");
        }

        try
        {
            // Check if the course exists
            var existingCourse = await db.Courses.FirstOrDefaultAsync(c => c.Id == courseId && c.OwnerId == OwnerId);
            if (existingCourse == null)
            {
                _log?.LogError($"DeleteCourseAsync: Course with ID [{courseId}] not found.", Operator: OwnerId);
                return ServiceRes.NotFound(ResCode.CourseNotFound, $"Course not found.", traceId: _log?.TraceId);
            }
            // Remove the course inside the student-course many-to-many relationship
            var studentsEnrolled = await db.Students
                .Where(s => s.Courses.Any(c => c.Id == courseId && c.OwnerId == OwnerId))
                .ToListAsync();
            foreach (var student in studentsEnrolled)
            {
                student.Courses.Remove(existingCourse);
            }
            db.Students.UpdateRange(studentsEnrolled);
            // Remove the course
            db.Courses.Remove(existingCourse);
            // Save changes
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException dbEx)
        {
            _log?.LogError("DeleteCourseAsync: Database error occurred while deleting course.", Operator: OwnerId, ex: dbEx);
            return ServiceRes.InternalError(ResCode.DatabaseError, "Unexpected error.", traceId: _log?.TraceId);
        }
        catch (Exception ex)
        {
            _log?.LogError("DeleteCourseAsync: An unexpected error occurred while deleting course.", Operator: OwnerId, ex: ex);
            return ServiceRes.InternalError(ResCode.DatabaseError, "An unexpected error occurred while deleting the course.", traceId: _log?.TraceId);
        }

        return ServiceRes.OK();

    }
    public async Task<(ServiceRes, TeachingCourse?)> GetCourseByIdAsync(string courseId)
    {
        if (string.IsNullOrWhiteSpace(OwnerId))
        {
            _log?.LogError("GetCourseByIdAsync: Operation attempted without valid owner.", Operator: OwnerId);
            return (ServiceRes.Unauthorized(ResCode.OwnerIdMissing, "Operation attempted without valid owner."), null);
        }

        if (string.IsNullOrWhiteSpace(courseId))
        {
            _log?.LogError("GetCourseByIdAsync: Invalid course ID provided.", Operator: OwnerId);
            return (ServiceRes.BadRequest(ResCode.InvalidCourseData, "Invalid course ID."), null);
        }

        try
        {
            var course = await db.Courses
                .Include(c => c.Students) // Include enrolled students
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == courseId && c.OwnerId == OwnerId);
            if (course == null)
            {
                _log?.LogError($"GetCourseByIdAsync: Course with ID [{courseId}] not found.", Operator: OwnerId);
                return (ServiceRes.NotFound(ResCode.CourseNotFound, $"Course not found.", traceId: _log?.TraceId), null);
            }
            return (ServiceRes.OK(), course);
        }
        catch (DbUpdateException dbEx)
        {
            _log?.LogError("GetCourseByIdAsync: Database error occurred while retrieving course.", Operator: OwnerId, ex: dbEx);
            return (ServiceRes.InternalError(ResCode.DatabaseError, "Unexpected error.", traceId: _log?.TraceId), null);
        }
        catch (Exception ex)
        {
            _log?.LogError("GetCourseByIdAsync: An unexpected error occurred while retrieving course.", Operator: OwnerId, ex: ex);
            return (ServiceRes.InternalError(ResCode.DatabaseError, "Unexpected error.", traceId: _log?.TraceId), null);
        }
    }
    public async Task<(ServiceRes, IEnumerable<TeachingCourse>)> GetAllCoursesAsync()
    {

        if (string.IsNullOrWhiteSpace(OwnerId))
        {
            _log?.LogError("GetAllCoursesAsync: Operation attempted without valid owner.", Operator: OwnerId);
            return (ServiceRes.BadRequest(ResCode.OwnerIdMissing, "Operation attempted without valid owner."), new List<TeachingCourse>());
        }
        try
        {
            var courses = await db.Courses
                .Include(c => c.Students) // Include enrolled students for each course
                .AsNoTracking()
                .Where(c => c.OwnerId == OwnerId)
                .ToListAsync();
            return (ServiceRes.OK(), courses);
        }
        catch (DbUpdateException dbEx)
        {
            _log?.LogError("GetAllCoursesAsync: Database error occurred while retrieving courses.", Operator: OwnerId, ex: dbEx);
            return (ServiceRes.InternalError(ResCode.DatabaseError, "Unexpected error.", traceId: _log?.TraceId), new List<TeachingCourse>());
        }
        catch (Exception ex)
        {
            _log?.LogError("GetAllCoursesAsync: An unexpected error occurred while retrieving courses.", Operator: OwnerId, ex: ex);
            return (ServiceRes.InternalError(ResCode.DatabaseError, "Unexpected error.", traceId: _log?.TraceId), new List<TeachingCourse>());
        }
    }
    public async Task<(ServiceRes, object?)> GetCourseWithStatsAsync(string courseId)
    {
        if (string.IsNullOrWhiteSpace(OwnerId))
        {
            _log?.LogError("GetCourseWithStatsAsync: Operation attempted without valid owner.", Operator: OwnerId);
            return (ServiceRes.Unauthorized(ResCode.OwnerIdMissing, "Operation attempted without valid owner."), null);
        }

        if (string.IsNullOrWhiteSpace(courseId))
        {
            _log?.LogError("GetCourseWithStatsAsync: Invalid course ID provided.", Operator: OwnerId);
            return (ServiceRes.BadRequest(ResCode.InvalidCourseData, "Invalid course ID."), null);
        }

        try
        {
            var course = await db.Courses
                .Include(c => c.Students) // Include enrolled students
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == courseId && c.OwnerId == OwnerId);

            if (course == null)
            {
                _log?.LogError($"GetCourseWithStatsAsync: Course with ID [{courseId}] not found.", Operator: OwnerId);
                return (ServiceRes.NotFound(ResCode.CourseNotFound, $"Course not found.", traceId: _log?.TraceId), null);
            }

            var courseWithStats = new
            {
                Course = course,
                Statistics = new
                {
                    TotalStudentsEnrolled = course.Students?.Count ?? 0,
                    StudentsList = course.Students?.Select(s => new
                    {
                        s.Id,
                        s.StudentId,
                        s.FirstName,
                        s.LastName,
                        s.NickName,
                        s.Email
                    }).ToList()
                }
            };

            return (ServiceRes.OK(), courseWithStats);
        }
        catch (DbUpdateException dbEx)
        {
            _log?.LogError("GetCourseWithStatsAsync: Database error occurred while retrieving course.", Operator: OwnerId, ex: dbEx);
            return (ServiceRes.InternalError(ResCode.DatabaseError, "Unexpected error.", traceId: _log?.TraceId), null);
        }
        catch (Exception ex)
        {
            _log?.LogError("GetCourseWithStatsAsync: An unexpected error occurred while retrieving course.", Operator: OwnerId, ex: ex);
            return (ServiceRes.InternalError(ResCode.DatabaseError, "Unexpected error.", traceId: _log?.TraceId), null);
        }
    }

    //Create a method to get courses with pagination
    public async Task<(ServiceRes, IEnumerable<TeachingCourse>)> GetCoursesPaginatedAsync(int pageNumber, int pageSize, string? orderBy = null, bool? ascending = true)
    {
        if (string.IsNullOrWhiteSpace(OwnerId))
        {
            _log?.LogError("GetCoursesPaginatedAsync: Operation attempted without valid owner.", Operator: OwnerId);
            return (ServiceRes.Unauthorized(ResCode.OwnerIdMissing, "Operation attempted without valid owner."), new List<TeachingCourse>());
        }

        if (pageNumber <= 0 || pageSize <= 0)
        {
            _log?.LogError("GetCoursesPaginatedAsync: Invalid pagination parameters.", Operator: OwnerId);
            return (ServiceRes.BadRequest(ResCode.InvalidPaginationParameters, "Invalid pagination parameters."), new List<TeachingCourse>());
        }

        try
        {
            var courses = await db.Courses
                .Include(c => c.Students) // Include enrolled students for each course
                .AsNoTracking()
                .Where(c => c.OwnerId == OwnerId)

                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (ServiceRes.OK(), courses);
        }
        catch (DbUpdateException dbEx)
        {
            _log?.LogError("GetCoursesPaginatedAsync: Database error occurred while retrieving courses.", Operator: OwnerId, ex: dbEx);
            return (ServiceRes.InternalError(ResCode.DatabaseError, "Unexpected error.", traceId: _log?.TraceId), new List<TeachingCourse>());
        }
        catch (Exception ex)
        {
            _log?.LogError("GetCoursesPaginatedAsync: An unexpected error occurred while retrieving courses.", Operator: OwnerId, ex: ex);
            return (ServiceRes.InternalError(ResCode.DatabaseError, "Unexpected error.", traceId: _log?.TraceId), new List<TeachingCourse>());
        }
    }


}
