using System;

namespace InteractiveHub.Service.Shared.Extensions;

public static class ObjectCopy
{
    public static T CopyFrom<T, TSrc>(this T target, TSrc source) where T : new()
    {
        if (source == null) throw new ArgumentNullException(nameof(source));

        var targetType = typeof(T);
   
        foreach (var sourceProp in typeof(TSrc).GetProperties())
        {
            var targetProp = targetType.GetProperty(sourceProp.Name);
            if (targetProp != null && targetProp.CanWrite)
            {
                var value = sourceProp.GetValue(source);
                targetProp.SetValue(target, value);
            }
        }

        return target;
    }
}
