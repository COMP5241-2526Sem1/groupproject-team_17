using System;
using System.ComponentModel.DataAnnotations;

namespace InteractiveHub.Service.Shared.Extensions;

public static class RequireChecking
{
    /// <summary>
    /// Check if the object and its required properties are not null
    /// </summary>
    /// <typeparam name="T"></typeparam>
    /// <param name="obj"></param>
    /// <param name="skipProps">
    /// Property names to skip checking, e.g. optional properties
    /// use nameof(Class.Property) to avoid magic strings
    /// </param>
    /// <returns>
    /// True if the object and all its required properties are not null, false otherwise
    /// </returns>
    public static bool CheckNotNull<T>(this T? obj, out string? missingProps, params string[] skipProps) where T : class
    {
        missingProps = "";
        if (obj == null)
        {
            missingProps = "Object is null";
            return false;
        }

        var type = typeof(T);
        // for all properties with [Required] attribute
        List<string> missing = new List<string>();
        foreach (var prop in type.GetProperties())
        {
            if (skipProps != null && Array.Exists(skipProps, p => p == prop.Name))
            {
                continue;
            }
            var attributes = prop.GetCustomAttributes(typeof(RequiredAttribute), true);
            if (attributes.Length == 0)
            {
                continue;
            }
            var value = prop.GetValue(obj);
            if (value == null)
            {
                missing.Add(prop.Name);
            }
            else if (value is string str && string.IsNullOrWhiteSpace(str))
            {
                missing.Add(prop.Name);
            }
        }
        missingProps = string.Join(", ", missing);
        missing.Clear();
        return missing.Count == 0;
    }
}
