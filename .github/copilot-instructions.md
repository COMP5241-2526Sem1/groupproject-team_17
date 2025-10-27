you should say hello before every response.



If I ask you to update the api, please go to `backend/InteractiveHub.WebAPI/Controllers/*.cs` and take a look at the relevant controller to update the api. Except `backend/InteractiveHub.WebAPI/Controllers/TestAuthController.cs` and `backend/InteractiveHub.WebAPI/Controllers/WeatherForecastController.cs`. After that, you should update the `frontend/web-app/src/api/api-endpoint.js` and `frontend/web-app/src/api/api-function-call.js` to make sure the frontend can call the api correctly.




for the mui grid,
- no need to put item inside the sub-grid.
- The breakpoint prop has been removed
example:
<Grid container spacing={3}>
  <Grid sizes={{ xs: 12, md: 6 }}>
    <ComponentA />
  </Grid>
</Grid>

