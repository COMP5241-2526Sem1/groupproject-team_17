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
            var value = sourceProp.GetValue(source);
            if (targetProp != null && targetProp.CanWrite && value != null)
            {

                targetProp.SetValue(target, value);
            }
        }

        return target;
    }
}
