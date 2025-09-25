using System;
using InteractiveHub.Service.Shared.Extensions;
using Microsoft.EntityFrameworkCore;
using Org.BouncyCastle.Ocsp;


namespace InteractiveHub.Service.ClassManagement;

public partial class ClassManager
{
    protected override void EnsureHasOwner(string messageIfMissing = "Operation attempted without valid owner.")
    {
        if (string.IsNullOrWhiteSpace(OwnerId))
        {
            _log?.LogError($"{messageIfMissing}", Operator: OwnerId);
            throw new ServiceException(ResCode.OwnerIdMissing, messageIfMissing);
        }

    }
    public async Task<ServiceRes> CreateCourseAsync(CreateCourseRequest request)
    {
        EnsureHasOwner("CreateCourseAsync: Operation attempted without valid owner.");
        if (request == null)
        {
            return new ServiceRes(ResCode.InvalidCourseData, "Invalid course data.");
        }

        if (!request.CheckNotNull(out var missingField))
        {
            _log?.LogError($"CreateCourseAsync: Missing required field [{missingField}].", Operator: OwnerId);
            return new ServiceRes(ResCode.CourseRequiredFieldMissing, $"Missing required field [{missingField}].");

        }
        var course = new TeachingCourse();
        course.CopyFrom(request);
        course.OwnerId = OwnerId;

        try
        {
            var existing = await db.Courses.FirstOrDefaultAsync(c => c.CourseCode == course.CourseCode
                && c.OwnerId == OwnerId
                && c.AcademicYear == course.AcademicYear
                && c.Semester == course.Semester);
            if (existing != null)
            {
                _log?.LogError($"CreateCourseAsync: Course with code [{course.CourseCode} in {course.AcademicYear} Semester{course.Semester}] already exists.", Operator: OwnerId);
                return new ServiceRes(ResCode.CourseAlreadyExists, $"Course with code [{course.CourseCode} in {course.AcademicYear} Semester{course.Semester}] already exists.", traceId: _log?.TraceId);
            }

            db.Courses.Add(course);
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException dbEx)
        {
            _log?.LogError("CreateCourseAsync: Database error occurred while creating course.", Operator: OwnerId, ex: dbEx);
            return new ServiceRes(ResCode.DatabaseError, "Unexpected error.", traceId: _log?.TraceId);
        }
        catch (Exception ex)
        {
            _log?.LogError("CreateCourseAsync: An unexpected error occurred while creating course.", Operator: OwnerId, ex: ex);
            return new ServiceRes(ResCode.DatabaseError, "An unexpected error occurred while creating the course.", traceId: _log?.TraceId);
        }

        return new ServiceRes(ResCode.OK);

    }
    public async Task<ServiceRes> UpdateCourseAsync(UpdateCourseRequest request, string courseId)
    {
        EnsureHasOwner("UpdateCourseAsync: Operation attempted without valid owner.");
        if (request == null)
        {
            return new ServiceRes(ResCode.InvalidCourseData, "Invalid course data.");
        }

        if (!request.CheckNotNull(out var missingField))
        {
            _log?.LogError($"UpdateCourseAsync: Missing required field [{missingField}].", Operator: OwnerId);
            return new ServiceRes(ResCode.CourseRequiredFieldMissing, $"Missing required field [{missingField}].");
        }

        try
        {
            var existingCourse = await db.Courses.FirstOrDefaultAsync(c => c.Id == courseId && c.OwnerId == OwnerId);
            if (existingCourse == null)
            {
                _log?.LogError($"UpdateCourseAsync: Course with ID [{courseId}] not found.", Operator: OwnerId);
                return new ServiceRes(ResCode.CourseNotFound, $"Course not found.", traceId: _log?.TraceId);
            }
            var existingFromOther = await db.Courses.FirstOrDefaultAsync(c => c.CourseCode == request.CourseCode
                      && c.OwnerId == OwnerId
                      && c.AcademicYear == request.AcademicYear
                      && c.Semester == request.Semester
                      && c.Id != courseId); // Check other existing courses
            if (existingFromOther != null)
            {

                _log?.LogError($"UpdateCourseAsync: Course with code [{request.CourseCode} in {request.AcademicYear} Semester{request.Semester}] already exists.", Operator: OwnerId);
                return new ServiceRes(ResCode.CourseAlreadyExists, $"Course with code [{request.CourseCode} in {request.AcademicYear} Semester{request.Semester}] already exists.", traceId: _log?.TraceId);

            }

            existingCourse.CopyFrom(request);
            db.Courses.Update(existingCourse);
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException dbEx)
        {
            _log?.LogError("UpdateCourseAsync: Database error occurred while updating course.", Operator: OwnerId, ex: dbEx);
            return new ServiceRes(ResCode.DatabaseError, "Unexpected error.", traceId: _log?.TraceId);
        }
        catch (Exception ex)
        {
            _log?.LogError("UpdateCourseAsync: An unexpected error occurred while updating course.", Operator: OwnerId, ex: ex);
            return new ServiceRes(ResCode.DatabaseError, "An unexpected error occurred while updating the course.", traceId: _log?.TraceId);
        }

        return new ServiceRes(ResCode.OK);

    }
    public async Task<ServiceRes> DeleteCourseAsync(string courseId)
    {
        EnsureHasOwner("DeleteCourseAsync: Operation attempted without valid owner.");
        if (string.IsNullOrWhiteSpace(courseId))
        {
            return new ServiceRes(ResCode.InvalidCourseData, "Invalid course data.");
        }

        try
        {
            // Check if the course exists
            var existingCourse = await db.Courses.FirstOrDefaultAsync(c => c.Id == courseId && c.OwnerId == OwnerId);
            if (existingCourse == null)
            {
                _log?.LogError($"DeleteCourseAsync: Course with ID [{courseId}] not found.", Operator: OwnerId);
                return new ServiceRes(ResCode.CourseNotFound, $"Course not found.", traceId: _log?.TraceId);
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
            return new ServiceRes(ResCode.DatabaseError, "Unexpected error.", traceId: _log?.TraceId);
        }
        catch (Exception ex)
        {
            _log?.LogError("DeleteCourseAsync: An unexpected error occurred while deleting course.", Operator: OwnerId, ex: ex);
            return new ServiceRes(ResCode.DatabaseError, "An unexpected error occurred while deleting the course.", traceId: _log?.TraceId);
        }

        return new ServiceRes(ResCode.OK);

    }
    public async Task<(ServiceRes, TeachingCourse?)> GetCourseByIdAsync(string courseId)
    {
        EnsureHasOwner("GetCourseByIdAsync: Operation attempted without valid owner.");
        if (string.IsNullOrWhiteSpace(courseId))
        {
            return (new ServiceRes(ResCode.InvalidCourseData, "Invalid course data."), null);
        }

        try
        {
            var course = await db.Courses.AsNoTracking().FirstOrDefaultAsync(c => c.Id == courseId && c.OwnerId == OwnerId);
            if (course == null)
            {
                _log?.LogError($"GetCourseByIdAsync: Course with ID [{courseId}] not found.", Operator: OwnerId);
                return (new ServiceRes(ResCode.CourseNotFound, $"Course not found.", traceId: _log?.TraceId), null);
            }
            return (new ServiceRes(ResCode.OK), course);
        }
        catch (DbUpdateException dbEx)
        {
            _log?.LogError("GetCourseByIdAsync: Database error occurred while retrieving course.", Operator: OwnerId, ex: dbEx);
            return (new ServiceRes(ResCode.DatabaseError, "Unexpected error.", traceId: _log?.TraceId), null);
        }
        catch (Exception ex)
        {
            _log?.LogError("GetCourseByIdAsync: An unexpected error occurred while retrieving course.", Operator: OwnerId, ex: ex);
            return (new ServiceRes(ResCode.DatabaseError, "Unexpected error.", traceId: _log?.TraceId), null);
        }
    }
    public async Task<(ServiceRes, List<TeachingCourse>)> GetAllCoursesAsync()
    {
        EnsureHasOwner("GetAllCoursesAsync: Operation attempted without valid owner.");

        try
        {
            var courses = await db.Courses.AsNoTracking().Where(c => c.OwnerId == OwnerId).ToListAsync();
            return (new ServiceRes(ResCode.OK), courses);
        }
        catch (DbUpdateException dbEx)
        {
            _log?.LogError("GetAllCoursesAsync: Database error occurred while retrieving courses.", Operator: OwnerId, ex: dbEx);
            return (new ServiceRes(ResCode.DatabaseError, "Unexpected error.", traceId: _log?.TraceId), new List<TeachingCourse>());
        }
        catch (Exception ex)
        {
            _log?.LogError("GetAllCoursesAsync: An unexpected error occurred while retrieving courses.", Operator: OwnerId, ex: ex);
            return (new ServiceRes(ResCode.DatabaseError, "Unexpected error.", traceId: _log?.TraceId), new List<TeachingCourse>());
        }
    }


    

}
