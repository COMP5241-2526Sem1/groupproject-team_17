# ASP.NET Core Dependency Injection Testing Template

This template provides a comprehensive testing infrastructure for ASP.NET Core applications with proper dependency injection setup.

## Overview

The testing template includes three main testing approaches:

1. **Unit Tests** - Using mocked dependencies for isolated testing
2. **Integration Tests** - Using real dependencies with in-memory database
3. **Model Tests** - Testing data models and entities

## Test Structure

### 1. BaseIntegrationTest (Abstract Base Class)

This abstract class provides the foundation for integration testing with:

- **Service Provider**: Complete DI container setup
- **In-Memory Database**: Entity Framework with InMemory provider
- **Configuration**: In-memory configuration for testing
- **Automatic Cleanup**: Proper disposal of resources

```csharp
[TestClass]
public abstract class BaseIntegrationTest
{
    protected IServiceProvider ServiceProvider { get; private set; }
    protected IServiceScope Scope { get; private set; }
    protected LoggerDbContext DbContext { get; private set; }
    protected IConfiguration Configuration { get; private set; }
}
```

### 2. HubLoggerUnitTests

Unit tests with mocked dependencies:

```csharp
[TestClass]
public class HubLoggerUnitTests
{
    private Mock<IHttpContextAccessor> _mockHttpContextAccessor;
    private Mock<HttpContext> _mockHttpContext;
    private Mock<ConnectionInfo> _mockConnection;
    private HubLogger _hubLogger;
}
```

**Features:**
- Mock HTTP context and connection info
- Test individual methods in isolation
- Fast execution with no external dependencies

### 3. HubLoggerIntegrationTests

Integration tests inheriting from BaseIntegrationTest:

```csharp
[TestClass]
public class HubLoggerIntegrationTests : BaseIntegrationTest
{
    private IHubLogger _hubLogger;
}
```

**Features:**
- Real database interactions using in-memory database
- Complete DI container with all services
- End-to-end testing of the logging system

### 4. LoggingModelsTests

Model and entity testing:

```csharp
[TestClass]
public class LoggingModelsTests
{
    // Tests for LogMessage and LogTrace models
}
```

## Configuration

### Service Registration

The base test class automatically configures:

```csharp
protected virtual void ConfigureServices(IServiceCollection services)
{
    // Configuration
    services.AddSingleton(Configuration);
    
    // Logging
    services.AddLogging(builder => builder.AddConsole());
    
    // HTTP Context
    services.AddHttpContextAccessor();
    
    // In-Memory Database
    services.AddDbContext<LoggerDbContext>(options =>
        options.UseInMemoryDatabase(databaseName: $"TestDb_{Guid.NewGuid()}"));
    
    // Logger Service
    services.AddScoped<IHubLogger, HubLogger>();
}
```

### Dependencies

The project includes these NuGet packages:

```xml
<ItemGroup>
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.12.0" />
    <PackageReference Include="MSTest" Version="3.6.4" />
    <PackageReference Include="Moq" Version="4.20.72" />
    <PackageReference Include="Microsoft.AspNetCore.Http.Abstractions" Version="2.2.0" />
    <PackageReference Include="Microsoft.Extensions.DependencyInjection" Version="9.0.6" />
    <PackageReference Include="Microsoft.EntityFrameworkCore.InMemory" Version="9.0.0" />
    <PackageReference Include="Microsoft.Extensions.Configuration" Version="9.0.6" />
    <PackageReference Include="Microsoft.Extensions.Hosting.Abstractions" Version="9.0.6" />
    <PackageReference Include="Microsoft.Extensions.Logging" Version="9.0.6" />
    <PackageReference Include="Microsoft.Extensions.Logging.Console" Version="9.0.6" />
</ItemGroup>

<ItemGroup>
    <FrameworkReference Include="Microsoft.AspNetCore.App" />
</ItemGroup>
```

## Usage Examples

### Unit Test Example

```csharp
[TestMethod]
public void LogInfo_ReturnsValidLogId()
{
    // Arrange
    var message = "Test info message";
    
    // Act
    var logId = _hubLogger.LogInfo(message);
    
    // Assert
    Assert.IsNotNull(logId);
    Assert.IsTrue(logId.Contains("."));
    Assert.IsTrue(logId.Length > 10);
}
```

### Integration Test Example

```csharp
[TestMethod]
public void LogInfo_WithDI_CreatesLogSuccessfully()
{
    // Arrange
    using var scope = ServiceProvider.CreateScope();
    var logger = scope.ServiceProvider.GetRequiredService<IHubLogger>();
    var message = "Integration test info message";
    
    // Act
    var logId = logger.LogInfo(message, "TestSource", "TestOperator");
    
    // Assert
    Assert.IsNotNull(logId);
    Assert.IsTrue(logId.Length > 0);
}
```

### Database Test Example

```csharp
[TestMethod]
public void DbContext_CanSaveLogMessages()
{
    // Arrange
    var logMessage = LogMessage.Create(
        LogMessage.LogLevel.INFO, 
        "Test database message", 
        "TestSource", 
        "TestOperator", 
        "TestService");

    // Act
    DbContext.LogMessages.Add(logMessage);
    var result = DbContext.SaveChanges();

    // Assert
    Assert.AreEqual(1, result);
    
    var savedMessage = DbContext.LogMessages.Find(logMessage.LogId);
    Assert.IsNotNull(savedMessage);
    Assert.AreEqual("Test database message", savedMessage.Message);
}
```

## Running Tests

Execute tests using the .NET CLI:

```bash
# Run all tests
dotnet test

# Run with detailed output
dotnet test --verbosity normal

# Run specific test class
dotnet test --filter "TestCategory=Integration"
```

## Best Practices

1. **Use Unit Tests** for testing individual components with mocked dependencies
2. **Use Integration Tests** for testing complete workflows with real database
3. **Inherit from BaseIntegrationTest** when you need DI container and database
4. **Override ConfigureServices()** to add custom services for specific test scenarios
5. **Use proper cleanup** - the base class handles resource disposal automatically
6. **Mock external dependencies** like HttpContext, external APIs, etc.

## Extending the Template

To add custom services for specific tests:

```csharp
[TestClass]
public class CustomIntegrationTests : BaseIntegrationTest
{
    protected override void ConfigureServices(IServiceCollection services)
    {
        base.ConfigureServices(services);
        
        // Add your custom services
        services.AddScoped<ICustomService, CustomService>();
        services.AddSingleton<IConfiguration>(customConfig);
    }
}
```

This template provides a solid foundation for testing ASP.NET Core applications with proper dependency injection, making your tests more maintainable and closer to real-world scenarios.