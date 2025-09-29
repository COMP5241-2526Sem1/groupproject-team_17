using System;

namespace InteractiveHub.Service.ClassManagement;

public interface IClassManager
{
    // Course Management Methods
    Task<ServiceRes> CreateCourseAsync(CreateCourseRequest request);
    Task<ServiceRes> UpdateCourseAsync(UpdateCourseRequest request, string courseId);
    Task<ServiceRes> DeleteCourseAsync(string courseId);
    Task<(ServiceRes, TeachingCourse?)> GetCourseByIdAsync(string courseId);
    Task<(ServiceRes, IEnumerable<TeachingCourse>)> GetAllCoursesAsync();
    Task<(ServiceRes, object?)> GetCourseWithStatsAsync(string courseId);

    // Student Management Methods
    Task<(ServiceRes, IEnumerable<StudentSimpleDto>?)> GetStudentsInCourseAsync(string courseId);
    Task<(ServiceRes, IEnumerable<Student>?)> GetAllStudentsByOwnerAsync();
    Task<ServiceRes> CreateOrUpdateStudentToCourse(IEnumerable<CreateStudentDto> students, string courseId);
    Task<ServiceRes> RemoveStudentsFromCourseAsync(IEnumerable<string> studentIds, string courseId);

    Task<ServiceRes> DeleteStudentAsync(string studentId);

    Task<ServiceRes> DelteStudentsAsync(IEnumerable<string> studentIds);
}
