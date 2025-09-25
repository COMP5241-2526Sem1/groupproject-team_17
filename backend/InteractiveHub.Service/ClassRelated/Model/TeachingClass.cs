using System;

namespace InteractiveHub.Service.ClassManagement;

public class TeachingClass : IHObject
{
    public string CourseId { get; set; } = string.Empty;
    // for example, "Lecture1", "Tutorial1", "Lab1"
    public string Identifier { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    public DateOnly Date { get; set; }
    public TimeOnly From { get; set; }
    public TimeOnly To { get; set; }
    public TeachingClass() : base()
    {
        //extract short id from guid

        var guid = Guid.NewGuid().ToString("N");
        Id = $"cls.{guid.Substring(0, 12)}";

    }
}


public class CreateSingleClassRequest
{
    public string CourseId { get; set; } = string.Empty;
    public string Identifier { get; set; } = string.Empty;
    public string? Description { get; set; } = string.Empty;
    public DateOnly Date { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);
    public TimeOnly From { get; set; } = TimeOnly.FromDateTime(DateTime.UtcNow);
    public TimeOnly To { get; set; } = TimeOnly.FromDateTime(DateTime.UtcNow);
}

public class CreateRecurringClassRequest
{
    public struct WeeklySchedule
    {
        public int DayOfWeek { get; set; } // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
        public TimeOnly From { get; set; }
        public TimeOnly To { get; set; }
    }
    public string CourseId { get; set; } = string.Empty;
    public string Identifier { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public WeeklySchedule[] Schedules { get; set; } = Array.Empty<WeeklySchedule>();
    public int RecurrenceCount { get; set; } = 1; // Number of occurrences
    // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    public List<int> DaysOfWeek { get; set; } = new List<int>();


    public TeachingClass[] GenerateClasses()
    {
        var classes = new List<TeachingClass>();
        var occurrences = 0;
        var weekStart = StartDate.Date;
        // The StartDate.Date can be any day of the week, we need to find the first occurrence of each scheduled day
        weekStart = weekStart.AddDays(-(int)weekStart.DayOfWeek); // Move to the start of the week (Sunday)

        while (occurrences < RecurrenceCount)
        {
            foreach (var schedule in Schedules)
            {
                // Find the date for this week's scheduled day
                
                var daysToAdd = (schedule.DayOfWeek - (int)weekStart.DayOfWeek + 7) % 7;
                var classDate = weekStart.AddDays(daysToAdd);

                // Only add if within recurrence count
                if (occurrences < RecurrenceCount)
                {
                    var newClass = new TeachingClass
                    {
                        CourseId = CourseId,
                        Identifier = Identifier,
                        Description = Description,
                        Date = DateOnly.FromDateTime(classDate),
                        From = schedule.From,
                        To = schedule.To
                    };
                    classes.Add(newClass);
                    occurrences++;
                }
            }
            // Move to next week
            weekStart = weekStart.AddDays(7);
        }

        return classes.ToArray();
    }
}
 
