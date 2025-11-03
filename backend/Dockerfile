# Use the official .NET 9.0 SDK image for building
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy project files
COPY ["InteractiveHub.WebAPI/InteractiveHub.WebAPI.csproj", "InteractiveHub.WebAPI/"]
COPY ["InteractiveHub/InteractiveHub.csproj", "InteractiveHub/"]
COPY ["InteractiveHub.Service/InteractiveHub.Service.csproj", "InteractiveHub.Service/"]
COPY ["InteractiveHub.Service.ClassManagement/InteractiveHub.Service.ClassManagement.csproj", "InteractiveHub.Service.ClassManagement/"]
COPY ["InteractiveHub.Service.Logger/InteractiveHub.Service.Logger.csproj", "InteractiveHub.Service.Logger/"]

# Restore dependencies
RUN dotnet restore "InteractiveHub.WebAPI/InteractiveHub.WebAPI.csproj"

# Copy all source code
COPY . .

# Build the application
WORKDIR "/src/InteractiveHub.WebAPI"
RUN dotnet build "InteractiveHub.WebAPI.csproj" -c Release -o /app/build

# Publish the application
FROM build AS publish
RUN dotnet publish "InteractiveHub.WebAPI.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Use the runtime image for the final stage
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
EXPOSE 8080
EXPOSE 8081

# Copy published files from publish stage
COPY --from=publish /app/publish .

# Set environment variables
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

# Run the application
ENTRYPOINT ["dotnet", "InteractiveHub.WebAPI.dll"]
