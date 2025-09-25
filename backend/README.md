# Backend
This directory contains the backend code for the COMP5241 Semester 1 Group 17 project.

## Technologies Used
- .NET 9.0 SDK
- ASP.NET Core Web API
- Entity Framework Core
- Dependency Injection

## Project Structure

- `InteractiveHub`: Main ASP.NET Core Web API project that serves as the entry point. References all other projects and handles dependency injection configuration.

- `InteractiveHub.Service`: Data access layer containing data models, database context, and Entity Framework migrations. Focuses on data persistence and ORM operations.

- `InteractiveHub.Service.Logger`: Dedicated logging service implementation with custom logger functionality and database-specific logging operations. References the models from InteractiveHub.Service.
In this project, it only focuses on the logging service implementation and database-related operations.

