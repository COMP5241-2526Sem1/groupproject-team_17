using System;

namespace InteractiveHub.Service.Shared.Extensions;

public static class EnumDesciptions
{
    public static string? ToDescriptionString<T>(this T val) where T : Enum
    {
       // Get the field description
       var attributes = typeof(T).GetField(val.ToString())?.GetCustomAttributes(typeof(System.ComponentModel.DescriptionAttribute), false);
       if (attributes != null && attributes.Length > 0)
       {
           return ((System.ComponentModel.DescriptionAttribute)attributes[0]).Description;
       }
       return null;
   }
}
