using NUnit.Framework;

[TestFixture]
public class LogManagerTests
{
    [Test]
    public void LogMessage_ShouldLogCorrectly()
    {
        // Arrange
        var logManager = new LogManager();
        var message = "Test log message";

        // Act
        logManager.LogMessage(message);

        // Assert
        Assert.IsTrue(logManager.LogContains(message));
    }

    [Test]
    public void LogError_ShouldLogErrorCorrectly()
    {
        // Arrange
        var logManager = new LogManager();
        var errorMessage = "Test error message";

        // Act
        logManager.LogError(errorMessage);

        // Assert
        Assert.IsTrue(logManager.ErrorLogContains(errorMessage));
    }
}