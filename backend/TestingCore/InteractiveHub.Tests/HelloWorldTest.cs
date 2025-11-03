using NUnit.Framework;

namespace InteractiveHub.Tests
{
    public class HelloWorldTest
    {
        [Test]
        public void TestHelloWorld()
        {
            Assert.AreEqual("Hello, World!", "Hello, World!");
        }
    }
}