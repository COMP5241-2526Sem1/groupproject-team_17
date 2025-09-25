using NUnit.Framework;

[TestFixture]
public class HubLoggerTests
{
    [Test]
    public void LogMessage_ShouldLogCorrectly()
    {
        // Arrange
        var logger = new HubLogger();
        var message = "Test log message";

        // Act
        logger.LogMessage(message);

        // Assert
        Assert.IsTrue(logger.LogContains(message));
    }

    [Test]
    public void LogError_ShouldLogErrorCorrectly()
    {
        // Arrange
        var logger = new HubLogger();
        var errorMessage = "Test error message";

        // Act
        logger.LogError(errorMessage);

        // Assert
        Assert.IsTrue(logger.ErrorLogContains(errorMessage));
    }
}