using System;
using Microsoft.EntityFrameworkCore;

namespace InteractiveHub.Service.ClassManagement;

public partial class ClassManager
{

    public async Task<(ServiceRes, IEnumerable<Student>?)> GetStudentsInCourseAsync(string courseId)
    {
        if (string.IsNullOrWhiteSpace(OwnerId))
        {
            _log?.LogWarning("GetStudentsInCourseAsync: OwnerId is not set. Unauthorized access attempt.");
            return (ServiceRes.Unauthorized(ResCode.Unauthorized, "OwnerId is not set. Unauthorized access."), null);
        }
        if (string.IsNullOrWhiteSpace(courseId))
        {
            _log?.LogWarning("GetStudentsInCourseAsync: CourseId is not set. Bad request.");
            return (ServiceRes.BadRequest(ResCode.InvalidCourseData, "CourseId cannot be null or empty."), null);
        }
        try
        {


            var course = await db.Courses
                .Include(c => c.Students) // Include enrolled students
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == courseId && c.OwnerId == OwnerId);

            if (course == null)
            {
                return (ServiceRes.NotFound(ResCode.CourseNotFound, "Course not found or access denied."), Array.Empty<Student>());
            }

            var students = course.Students.ToList();
            _log?.LogInfo($"GetStudentsInCourseAsync: Retrieved {students.Count} students for course {courseId}.", Operator: OwnerId);
            return (ServiceRes.OK("Students retrieved successfully."), students);
        }
        catch (DbUpdateException dbEx)
        {
            _log?.LogError("GetStudentsInCourseAsync: Database error while retrieving students in course.", ex: dbEx);
            return (ServiceRes.InternalError(ResCode.DatabaseError, "A database error occurred while retrieving students.", traceId: _log?.TraceId), null);
        }
        catch (Exception ex)
        {
            _log?.LogError("GetStudentsInCourseAsync: Error while retrieving students in course.", ex: ex);
            return (ServiceRes.InternalError(ResCode.InternalError, "An error occurred while retrieving students.", traceId: _log?.TraceId), null);
        }
    }
    public async Task<(ServiceRes, IEnumerable<Student>?)> GetAllStudentsByOwnerAsync()
    {
        if (string.IsNullOrWhiteSpace(OwnerId))
        {
            _log?.LogWarning("GetAllCoursesAsync: OwnerId is not set. Unauthorized access attempt.");
            return (ServiceRes.Unauthorized(ResCode.Unauthorized, "OwnerId is not set. Unauthorized access."), null);
        }
        try
        {
            var students = await db.Students
                .AsNoTracking()
                .Where(s => s.OwnerId == OwnerId)
                .ToListAsync();
            _log?.LogInfo($"GetAllStudentsByOwnerAsync: Retrieved {students.Count} students for owner {OwnerId}.", Operator: OwnerId);
            return (ServiceRes.OK(), students);

        }
        catch (DbUpdateException dbEx)
        {
            _log?.LogError("GetAllCoursesAsync: Database error while retrieving courses.", ex: dbEx);
            return (ServiceRes.InternalError(ResCode.DatabaseError, "A database error occurred while retrieving courses.", traceId: _log?.TraceId), null);
        }
        catch (Exception ex)
        {
            _log?.LogError("GetAllCoursesAsync: Error while retrieving courses.", ex: ex);
            return (ServiceRes.InternalError(ResCode.InternalError, "An error occurred while retrieving courses.", traceId: _log?.TraceId), null);
        }
    }
    public async Task<ServiceRes> CreateOrUpdateStudentToCourse(IEnumerable<CreateStudentDto> students, string courseId)
    {
        // Validate OwnerId
        if (string.IsNullOrWhiteSpace(OwnerId))
        {
            _log?.LogWarning("CreateOrUpdateStudent: OwnerId is not set. Unauthorized access attempt.");
            return ServiceRes.Unauthorized(ResCode.Unauthorized, "OwnerId is not set. Unauthorized access.");
        }
        if (students == null || !students.Any())
        {
            _log?.LogWarning("CreateOrUpdateStudent: Student list is null or empty. Bad request.");
            return ServiceRes.BadRequest(ResCode.InvalidStudentData, "Student list cannot be null or empty.");
        }
        if (string.IsNullOrWhiteSpace(courseId))
        {
            _log?.LogWarning("CreateOrUpdateStudent: CourseId is null or empty. Bad request.");
            return ServiceRes.BadRequest(ResCode.InvalidCourseData, "CourseId cannot be null or empty.");
        }
        if (students.Any(s => string.IsNullOrWhiteSpace(s.StudentId)))
        {
            _log?.LogWarning("CreateOrUpdateStudent: One or more students have null or empty StudentId. Bad request.");
            return ServiceRes.BadRequest(ResCode.InvalidStudentData, "Each student must have a valid StudentId.");
        }



        try
        {
            // Fetch the course to ensure it exists and belongs to the owner (without AsNoTracking for updates)
            var course = await db.Courses
                .Include(c => c.Students)
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == courseId && c.OwnerId == OwnerId);

            if (course == null)
            {
                _log?.LogWarning("CreateOrUpdateStudent: Course not found or access denied.");
                return ServiceRes.NotFound(ResCode.CourseNotFound, "Course not found or access denied.");
            }

            // Get all existing students by StudentId and OwnerId (not by Entity Id)
            var incomingStudentIds = students.Select(s => s.StudentId).ToList();

            var existingStudents = course.Students
                .Where(s => incomingStudentIds.Contains(s.StudentId)).ToList();

            var studentsToUpdate = new List<Student>();
            var studentsToEnroll = new List<Student>();

            foreach (var incomingStudent in students)
            {
                // Check if student already exists in database
                var existingStudent = existingStudents.FirstOrDefault(es => es.StudentId == incomingStudent.StudentId);

                // If exists, update details; if not, add new student
                if (existingStudent != null)
                {
                    // Update existing student data
                    existingStudent.FirstName = incomingStudent.FirstName ?? existingStudent.FirstName;
                    existingStudent.LastName = incomingStudent.LastName ?? existingStudent.LastName;
                    existingStudent.NickName = incomingStudent.NickName ?? existingStudent.NickName;
                    existingStudent.Email = incomingStudent.Email ?? existingStudent.Email;
                    studentsToUpdate.Add(existingStudent);
                }
                else
                {
                    // New student - set OwnerId and add to database
                    var newStudent = new Student
                    {
                        OwnerId = OwnerId,
                        StudentId = incomingStudent.StudentId,
                        FirstName = incomingStudent.FirstName ?? string.Empty,
                        LastName = incomingStudent.LastName ?? string.Empty,
                        NickName = incomingStudent.NickName ?? string.Empty,
                        Email = incomingStudent.Email ?? string.Empty,
                    };
                    newStudent.Courses.Add(course);
                    studentsToEnroll.Add(newStudent);
                }
            }

            // Add new students to database
            if (studentsToEnroll.Any())
            {
                db.Students.AddRange(studentsToEnroll);
            }
            if (studentsToUpdate.Any())
            {
                db.Students.UpdateRange(studentsToUpdate);
            }

            db.Courses.Update(course);
            await db.SaveChangesAsync();

            _log?.LogInfo($"CreateOrUpdateStudent: Successfully processed {students.Count()} students for course {courseId}. Updated: {studentsToUpdate.Count}, Enrolled: {studentsToEnroll.Count}", Operator: OwnerId);
            return ServiceRes.OK("Students created/updated successfully.");
        }
        catch (DbUpdateException dbEx)
        {
            _log?.LogError("CreateOrUpdateStudent: Database error while creating or updating students.", ex: dbEx);
            return ServiceRes.InternalError(ResCode.DatabaseError, "A database error occurred while creating or updating students.", traceId: _log?.TraceId);
        }
        catch (Exception ex)
        {
            _log?.LogError("CreateOrUpdateStudent: Error while creating or updating students.", ex: ex);
            return ServiceRes.InternalError(ResCode.InternalError, "An error occurred while creating or updating students.", traceId: _log?.TraceId);
        }

    }

    public async Task<ServiceRes> RemoveStudentsFromCourseAsync(IEnumerable<string> studentIds, string courseId)
    {
        // Validate OwnerId
        if (string.IsNullOrWhiteSpace(OwnerId))
        {
            _log?.LogWarning("RemoveStudentFromCourseAsync: OwnerId is not set. Unauthorized access attempt.");
            return ServiceRes.Unauthorized(ResCode.Unauthorized, "OwnerId is not set. Unauthorized access.");
        }
        if (studentIds == null || !studentIds.Any() || string.IsNullOrWhiteSpace(courseId))
        {
            _log?.LogWarning("RemoveStudentFromCourseAsync: StudentIds or CourseId is null or empty. Bad request.");
            return ServiceRes.BadRequest(ResCode.InvalidStudentData, "StudentIds and CourseId cannot be null or empty.");
        }

        try
        {
            // Fetch the course to ensure it exists and belongs to the owner
            var course = await db.Courses
                .Include(c => c.Students)
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == courseId && c.OwnerId == OwnerId);
            if (course == null)
            {
                _log?.LogWarning("RemoveStudentFromCourseAsync: Course not found or access denied.");
                return ServiceRes.NotFound(ResCode.CourseNotFound, "Course not found or access denied.");
            }

            // Find the students in the course
            var studentToBeRemove = course.Students.Where(s => studentIds.Contains(s.StudentId)).ToList();
            if (!studentToBeRemove.Any())
            {
                _log?.LogWarning("RemoveStudentFromCourseAsync: No students found in the specified course.");
                return ServiceRes.NotFound(ResCode.StudentNotFound, "No students found in the specified course.");
            }

            // Remove the students from the course
            course.Students.RemoveAll(s => studentToBeRemove.Select(st => st.StudentId).Contains(s.StudentId));

            // Remove the course from each student's course list
            studentToBeRemove = studentToBeRemove.Select(st =>
            {
                st.Courses.Remove(course);
                return st;
            }).ToList();


            db.Courses.Update(course);
            db.Students.UpdateRange(studentToBeRemove);


            await db.SaveChangesAsync();

            _log?.LogInfo($"RemoveStudentFromCourseAsync: Successfully removed students from course {courseId}.", Operator: OwnerId);
            return ServiceRes.OK("Students removed from course successfully.");
        }
        catch (DbUpdateException dbEx)
        {
            _log?.LogError("RemoveStudentFromCourseAsync: Database error while removing student from course.", ex: dbEx);
            return ServiceRes.InternalError(ResCode.DatabaseError, "A database error occurred while removing the student from the course.", traceId: _log?.TraceId);
        }
        catch (Exception ex)
        {
            _log?.LogError("RemoveStudentFromCourseAsync: Error while removing student from course.", ex: ex);
            return ServiceRes.InternalError(ResCode.InternalError, "An error occurred while removing the student from the course.", traceId: _log?.TraceId);
        }

    }

    public async Task<ServiceRes> DeleteStudentAsync(string studentId)
    {
        // Validate OwnerId
        if (string.IsNullOrWhiteSpace(OwnerId))
        {
            _log?.LogWarning("DeleteStudentAsync: OwnerId is not set. Unauthorized access attempt.");
            return ServiceRes.Unauthorized(ResCode.Unauthorized, "OwnerId is not set. Unauthorized access.");
        }
        if (string.IsNullOrWhiteSpace(studentId))
        {
            _log?.LogWarning("DeleteStudentAsync: StudentId is null or empty. Bad request.");
            return ServiceRes.BadRequest(ResCode.InvalidStudentData, "StudentId cannot be null or empty.");
        }

        try
        {
            // Fetch the student to ensure they exist and belong to the owner
            var student = await db.Students
                .Include(s => s.Courses) // Include courses to handle relationships
                .FirstOrDefaultAsync(s => s.StudentId == studentId && s.OwnerId == OwnerId);

            if (student == null)
            {
                _log?.LogWarning("DeleteStudentAsync: Student not found or access denied.");
                return ServiceRes.NotFound(ResCode.StudentNotFound, "Student not found or access denied.");
            }

            // Remove the student from all associated courses
            foreach (var course in student.Courses)
            {
                course.Students.Remove(student);
                db.Courses.Update(course);
            }

            // Remove the student from the database
            db.Students.Remove(student);
            await db.SaveChangesAsync();

            _log?.LogInfo($"DeleteStudentAsync: Successfully deleted student {studentId}.", Operator: OwnerId);
            return ServiceRes.OK("Student deleted successfully.");
        }
        catch (DbUpdateException dbEx)
        {
            _log?.LogError("DeleteStudentAsync: Database error while deleting student.", ex: dbEx);
            return ServiceRes.InternalError(ResCode.DatabaseError, "A database error occurred while deleting the student.", traceId: _log?.TraceId);
        }
        catch (Exception ex)
        {
            _log?.LogError("DeleteStudentAsync: Error while deleting student.", ex: ex);
            return ServiceRes.InternalError(ResCode.InternalError, "An error occurred while deleting the student.", traceId: _log?.TraceId);
        }
    }

    public async Task<ServiceRes> DelteStudentsAsync(IEnumerable<string> studentIds)
    {
        // Validate OwnerId
        if (string.IsNullOrWhiteSpace(OwnerId))
        {
            _log?.LogWarning("DeleteStudentsAsync: OwnerId is not set. Unauthorized access attempt.");
            return ServiceRes.Unauthorized(ResCode.Unauthorized, "OwnerId is not set. Unauthorized access.");
        }
        if (studentIds == null || !studentIds.Any())
        {
            _log?.LogWarning("DeleteStudentsAsync: StudentIds is null or empty. Bad request.");
            return ServiceRes.BadRequest(ResCode.InvalidStudentData, "StudentIds cannot be null or empty.");
        }

        try
        {
            // Fetch the students to ensure they exist and belong to the owner
            var students = await db.Students
                .Include(s => s.Courses) // Include courses to handle relationships
                .Where(s => studentIds.Contains(s.StudentId) && s.OwnerId == OwnerId)
                .ToListAsync();

            if (!students.Any())
            {
                _log?.LogWarning("DeleteStudentsAsync: No students found or access denied.");
                return ServiceRes.NotFound(ResCode.StudentNotFound, "No students found or access denied.");
            }

            // Remove each student from all associated courses
            foreach (var student in students)
            {
                foreach (var course in student.Courses)
                {
                    course.Students.Remove(student);
                    db.Courses.Update(course);
                }
            }

            // Remove the students from the database
            db.Students.RemoveRange(students);
            await db.SaveChangesAsync();

            _log?.LogInfo($"DeleteStudentsAsync: Successfully deleted {students.Count} students.", Operator: OwnerId);
            return ServiceRes.OK("Students deleted successfully.");
        }
        catch (DbUpdateException dbEx)
        {
            _log?.LogError("DeleteStudentsAsync: Database error while deleting students.", ex: dbEx);
            return ServiceRes.InternalError(ResCode.DatabaseError, "A database error occurred while deleting the students.", traceId: _log?.TraceId);
        }
        catch (Exception ex)
        {
            _log?.LogError("DeleteStudentsAsync: Error while deleting students.", ex: ex);
            return ServiceRes.InternalError(ResCode.InternalError, "An error occurred while deleting the students.", traceId: _log?.TraceId);
        }
    }
}
