

## Entity Relationships

### 1. TeachingCourse ↔ Student (Many-to-Many)
- **Relationship**: Students can enroll in multiple courses; courses can have multiple students
- **Implementation**: Entity Framework Core manages the join table automatically
- **Navigation Properties**:
  - `TeachingCourse.Students` → `List<Student>`
  - `Student.Courses` → `List<TeachingCourse>`

### 2. TeachingCourse → TeachingClass (One-to-Many)
- **Relationship**: One course can have multiple classes (lectures, tutorials, labs)
- **Foreign Key**: `TeachingClass.CourseId` references `TeachingCourse.Id`
- **Navigation Properties**:
  - `TeachingCourse.Classes` → `List<TeachingClass>`
  - Configured with `HasMany().WithOne().HasForeignKey()`

### 3. Owner/Teacher → All Entities (One-to-Many)
- **Relationship**: Each teacher/owner can have multiple students, courses, and classes
- **Implementation**: Through `OwnerId` property inherited from `IHObject`
- **Security**: All entities are scoped to their owner for data isolation
