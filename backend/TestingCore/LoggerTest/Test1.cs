// Create a base test file
using Microsoft.VisualStudio.TestTools.UnitTesting;
using InteractiveHub.Service.Logger;
using InteractiveHub.Service.Logger.Repository;
using Moq;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Net;
using System.Linq;
using InteractiveHub.Service;
using Microsoft.AspNetCore.SignalR;

namespace LoggerTest;

/// <summary>
/// Base test class with ASP.NET Core Dependency Injection setup
/// This provides a complete test infrastructure with proper DI container
/// </summary>
[TestClass]
public abstract class BaseIntegrationTest
{
    protected IServiceProvider ServiceProvider { get; private set; } = null!;
    protected IServiceScope Scope { get; private set; } = null!;
    protected LoggerDbContext DbContext { get; private set; } = null!;
    protected IConfiguration Configuration { get; private set; } = null!;

    [TestInitialize]
    public virtual void TestInitialize()
    {
        // Build configuration
        Configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                {"ConnectionStrings:DefaultConnection", "server=127.0.0.1;database=devtest;user=mydev;password=1qaz3edc!!"}
            })
            .Build();

        // Create service collection
        var services = new ServiceCollection();
        ConfigureServices(services);

        // Build service provider
        ServiceProvider = services.BuildServiceProvider();
        Scope = ServiceProvider.CreateScope();

        // Get DbContext
        DbContext = Scope.ServiceProvider.GetRequiredService<LoggerDbContext>();

        // Ensure database is created
        DbContext.Database.EnsureCreated();
        HubLogger.Initialize(ServiceProvider);
    }

    /// <summary>
    /// Configure services for testing
    /// Override this method to add custom services for specific test classes
    /// </summary>
    protected virtual void ConfigureServices(IServiceCollection services)
    {
        // Add configuration
        services.AddSingleton(Configuration);

        // Add logging
        services.AddLogging(builder => builder.AddConsole());

        // Add HttpContextAccessor
        services.AddHttpContextAccessor();

        // Add In-Memory Database for testing
        services.AddDbContext<LoggerDbContext>(options =>
            options.UseMySQL("host=127.0.0.1;database=devtest;user=mydev;password=1qaz3edc!!"));

        // Register HubLogger
        services.AddScoped<IHubLogger, HubLogger>();
    }

    [TestCleanup]
    public virtual void TestCleanup()
    {
        DbContext?.Database.EnsureDeleted();
        DbContext?.Dispose();
        Scope?.Dispose();
        ServiceProvider?.GetService<IHostApplicationLifetime>()?.StopApplication();
    }
}

/// <summary>
/// Unit tests using mocked dependencies
/// Use this for testing individual components in isolation
/// </summary>
[TestClass]
[TestCategory("Unit")]
public class HubLoggerUnitTests
{
    private Mock<IHttpContextAccessor> _mockHttpContextAccessor = null!;
    private Mock<HttpContext> _mockHttpContext = null!;
    private Mock<ConnectionInfo> _mockConnection = null!;
    private IHubLogger _hubLogger = null!;

    [TestInitialize]
    public void Setup()
    {
        // Setup mocks
        _mockHttpContextAccessor = new Mock<IHttpContextAccessor>();
        _mockHttpContext = new Mock<HttpContext>();
        _mockConnection = new Mock<ConnectionInfo>();
        
        // Configure mock behavior
        var ipAddress = IPAddress.Parse("192.168.1.100");
        _mockConnection.Setup(c => c.RemoteIpAddress).Returns(ipAddress);
        _mockHttpContext.Setup(c => c.Connection).Returns(_mockConnection.Object);
        _mockHttpContextAccessor.Setup(a => a.HttpContext).Returns(_mockHttpContext.Object);
        
        // Create instance under test
        _hubLogger = new HubLogger(_mockHttpContextAccessor.Object);
    }


    [TestMethod]
    public void Constructor_SetsDefaultService()
    {
        // Arrange & Act
        IHubLogger logger = new HubLogger(_mockHttpContextAccessor.Object);
        
        // Assert
        Assert.AreEqual("System", logger.Service);
    }

    [TestMethod]
    public void RemoteIpAddress_ReturnsCorrectIpAddress()
    {
        // Arrange
        var expectedIp = "192.168.1.100";
        
        // Act
        var actualIp = _hubLogger.RemoteIpAddress;
        
        // Assert
        Assert.AreEqual(expectedIp, actualIp);
    }

    [TestMethod]
    public void SetService_UpdatesServiceName()
    {
        // Arrange
        var expectedService = "TestService";
        
        // Act
        _hubLogger.SetService(expectedService);
        
        // Assert
        Assert.AreEqual(expectedService, _hubLogger.Service);
    }

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

    [TestMethod]
    public void LogError_WithException_ReturnsValidLogId()
    {
        // Arrange
        var message = "Test error message";
        var exception = new ArgumentException("Test exception");
        
        // Act
        var logId = _hubLogger.LogError(message, null, exception);
        
        // Assert
        Assert.IsNotNull(logId);
        Assert.IsTrue(logId.Contains("."));
    }

    [TestMethod]
    public void LogWarning_ReturnsValidLogId()
    {
        // Arrange
        var message = "Test warning message";
        
        // Act
        var logId = _hubLogger.LogWarning(message);
        
        // Assert
        Assert.IsNotNull(logId);
        Assert.IsTrue(logId.Contains("."));
    }

    [TestMethod]
    [TestCategory("Debug")]
    public void DebugExample_InspectLoggerBehavior()
    {
        // Arrange - Set breakpoint here
        var message = "Debug test message";
        var source = "DebugSource";
        var operatorName = "DebugUser";
        
        // Set breakpoint here to inspect _hubLogger state
        _hubLogger.SetService("DebugService");
        
        // Act - Set breakpoint here to step through logging
        var infoLogId = _hubLogger.LogInfo(message, source, operatorName);
        var warningLogId = _hubLogger.LogWarning("Warning: " + message, source, operatorName);
        
        // Set breakpoint here to inspect results
        var exception = new InvalidOperationException("Debug exception");
        var errorLogId = _hubLogger.LogError("Error: " + message, source, exception, operatorName);
        
        // Assert - Set breakpoint here to verify all IDs
        Assert.IsNotNull(infoLogId);
        Assert.IsNotNull(warningLogId);
        Assert.IsNotNull(errorLogId);
        
        // You can inspect the static queues here during debugging
        var messages = HubLogger.RetrieveLogMessages();
        var traces = HubLogger.RetrieveLogTraces();
        
        Assert.IsTrue(messages.Any());
        Assert.IsTrue(traces.Any());
    }

    [TestCleanup]
    public void Cleanup()
    {
        _mockHttpContextAccessor?.Reset();
        _mockHttpContext?.Reset();
        _mockConnection?.Reset();
    }
}

/// <summary>
/// Integration tests using real dependencies and DI container
/// Use this for testing the complete system with database interactions
/// </summary>
[TestClass]
[TestCategory("Integration")]
public class HubLoggerIntegrationTests : BaseIntegrationTest
{
    private IHubLogger _hubLogger = null!;
    private Mock<IHttpContextAccessor> _mockHttpContextAccessor = null!;

    [TestInitialize]
    public override void TestInitialize()
    {
        base.TestInitialize();

        // Setup HttpContext mock for integration tests
        _mockHttpContextAccessor = new Mock<IHttpContextAccessor>();
        var mockHttpContext = new Mock<HttpContext>();
        var mockConnection = new Mock<ConnectionInfo>();
        
        var ipAddress = IPAddress.Parse("10.0.0.1");
        mockConnection.Setup(c => c.RemoteIpAddress).Returns(ipAddress);
        mockHttpContext.Setup(c => c.Connection).Returns(mockConnection.Object);
        _mockHttpContextAccessor.Setup(a => a.HttpContext).Returns(mockHttpContext.Object);
        
        // Create HubLogger with mocked HttpContext
        _hubLogger = new HubLogger(_mockHttpContextAccessor.Object);
    }

    protected override void ConfigureServices(IServiceCollection services)
    {
        base.ConfigureServices(services);
        
        // Add any additional services specific to integration tests
        services.AddScoped<IHubLogger>(provider => 
            new HubLogger(_mockHttpContextAccessor.Object));
    }

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

    [TestMethod]
    public void LogError_WithDI_CreatesLogAndTraceSuccessfully()
    {
        // Arrange
        using var scope = ServiceProvider.CreateScope();
        var logger = scope.ServiceProvider.GetRequiredService<IHubLogger>();
        var message = "Integration test error message";
        var exception = new InvalidOperationException("Test exception");
        
        // Act
        var logId = logger.LogError(message, "TestSource", exception, "TestOperator");
        
        // Assert
        Assert.IsNotNull(logId);
        Assert.IsTrue(logId.Length > 0);
    }

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

    [TestMethod]
    public void DbContext_CanSaveLogTraces()
    {
        // Arrange
        var exception = new ArgumentException("Test exception for trace");
        var logTrace = LogTrace.Create("test-log-id", "Test trace message", exception);

        // Act
        DbContext.LogTraces.Add(logTrace);
        var result = DbContext.SaveChanges();

        // Assert
        Assert.AreEqual(1, result);
        
        var savedTrace = DbContext.LogTraces.Find(logTrace.Id);
        Assert.IsNotNull(savedTrace);
        Assert.AreEqual("Test trace message", savedTrace.Message);
        Assert.IsNotNull(savedTrace.StackTrace);
    }
}

/// <summary>
/// Model tests for LogMessage and LogTrace entities
/// </summary>
[TestClass]
[TestCategory("Model")]
public class LoggingModelsTests
{
    [TestMethod]
    public void LogMessage_Create_SetsAllProperties()
    {
        // Arrange
        var level = LogMessage.LogLevel.ERROR;
        var message = "Test message";
        var source = "Test source";
        var operatorName = "TestUser";
        var service = "TestService";
        
        // Act
        var logMessage = LogMessage.Create(level, message, source, operatorName, service);
        
        // Assert
        Assert.AreEqual(level, logMessage.Level);
        Assert.AreEqual(message, logMessage.Message);
        Assert.AreEqual(source, logMessage.Source);
        Assert.AreEqual(operatorName, logMessage.Operator);
        Assert.AreEqual(service, logMessage.Service);
        Assert.IsNotNull(logMessage.LogId);
        Assert.IsTrue(logMessage.Timestamp <= DateTime.UtcNow);
    }

    [TestMethod]
    public void LogTrace_Create_SetsAllProperties()
    {
        // Arrange
        var logId = "test-log-id";
        var message = "Test trace message";
        var exception = new ArgumentException("Test exception");
        
        // Act
        var logTrace = LogTrace.Create(logId, message, exception);
        
        // Assert
        Assert.AreEqual(logId, logTrace.LogId);
        Assert.AreEqual(message, logTrace.Message);
        Assert.IsNotNull(logTrace.StackTrace);
        Assert.IsTrue(logTrace.Timestamp <= DateTime.UtcNow);
    }

    [TestMethod]
    public void LogMessage_DefaultConstructor_GeneratesUniqueId()
    {
        // Arrange & Act
        var log1 = new LogMessage();
        var log2 = new LogMessage();
        
        // Assert
        Assert.AreNotEqual(log1.LogId, log2.LogId);
        Assert.IsTrue(log1.LogId.Contains("."));
        Assert.IsTrue(log2.LogId.Contains("."));
    }
}
