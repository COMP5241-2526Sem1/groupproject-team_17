


using Microsoft.AspNetCore.Mvc.Filters;

public class BadRequestActionFilter : IResultFilter
{
    public void OnResultExecuting(ResultExecutingContext context)
    {
        if (context.ModelState.IsValid == false)
        {
            context.HttpContext.Response.StatusCode = 400;
            context.Result = new Microsoft.AspNetCore.Mvc.JsonResult(new
            {
                code = 400,
                message = "Bad Request",
                data = context.ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToArray()
            });
        }
    }

    public void OnResultExecuted(ResultExecutedContext context)
    {
        // Do nothing
    }
}