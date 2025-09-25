using InteractiveHub.Service;
using InteractiveHub.Service.ClassManagement.Repository;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
namespace InteractiveHub.Service.ClassManagement;

public partial class ClassManager : ServiceBase, IClassManager
{
    private readonly ClassDbContext db;
    public ClassManager(ClassDbContext dbContext, IHubLogger? logManager) : base(logManager)
    {
        db = dbContext;
        SetServiceName("Class Manager");
    }
    public static void Initialize(WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var services = scope.ServiceProvider;
        var dbContext = services.GetRequiredService<ClassDbContext>();
        dbContext.Database.Migrate();
    }
}
