using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InteractiveHub.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TestAuthController : ControllerBase
{
    private readonly ILogger<TestAuthController> _logger;

    public TestAuthController(ILogger<TestAuthController> logger)
    {
        _logger = logger;
    }

    [HttpGet("public")]
    public IActionResult GetPublic()
    {
        return Ok(new { message = "This is a public endpoint", timestamp = DateTime.UtcNow });
    }

    [HttpGet("protected")]
    [Authorize]
    public IActionResult GetProtected()
    {
        _logger.LogInformation("Protected endpoint accessed by authenticated user");
        return Ok(new { 
            message = "This is a protected endpoint", 
            timestamp = DateTime.UtcNow,
            user = User.Identity?.Name ?? "Unknown"
        });
    }

    [HttpGet("admin")]
    [Authorize(Roles = "admin")]
    public IActionResult GetAdmin()
    {
        _logger.LogInformation("Admin endpoint accessed");
        return Ok(new { 
            message = "This is an admin-only endpoint", 
            timestamp = DateTime.UtcNow,
            user = User.Identity?.Name ?? "Unknown"
        });
    }
}