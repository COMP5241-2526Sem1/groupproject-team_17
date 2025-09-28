import { TextField } from "@mui/material";
import { useSetState } from "minimal-shared/hooks";






export function CourseSearch({ keyword, onSearch }) {

    const handleSearchChange = (event) => {
        onSearch?.(event.target.value);
    }

    return <TextField
        variant="outlined"
        placeholder="Search..."
        value={keyword}
        width={120}
        onChange={handleSearchChange}
    />
}