using NUnit.Framework;

namespace InteractiveHub.Service.Tests
{
    public class HelloWorldTest
    {
        [Test]
        public void HelloWorld_ReturnsExpectedString()
        {
            Assert.AreEqual("Hello, World!", "Hello, World!");
        }
    }
}