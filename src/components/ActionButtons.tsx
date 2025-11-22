// components/ActionButtons.tsx
import React from "react";
import { Button, Box } from "@mui/material";

interface ActionButtonsProps {
  onFormTypes: () => void;
  onCreateRecord: () => void;
  onList: () => void;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  onFormTypes,
  onCreateRecord,
  onList,
}) => {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        mb: 4,
        gap: 2, // Even spacing between buttons
        flexWrap: "wrap", // Responsive wrap on small screens
      }}
    >
      <Button
        variant="contained"
        onClick={onFormTypes}
        sx={{
          borderRadius: 50, // Completely round edges (pill-shaped)
          fontWeight: 700, // Bolder text
          textTransform: "none", // Optional: Prevent uppercase transformation for cleaner look
          px: 3, // Extra horizontal padding for rounder feel
        }}
      >
        مدیریت انواع فرم
      </Button>
      <Button
        variant="contained"
        onClick={onCreateRecord}
        sx={{
          borderRadius: 50, // Completely round edges (pill-shaped)
          fontWeight: 700, // Bolder text
          textTransform: "none", // Optional: Prevent uppercase transformation for cleaner look
          px: 3, // Extra horizontal padding for rounder feel
        }}
      >
        ایجاد رکورد
      </Button>
      <Button
        variant="contained"
        onClick={onList}
        sx={{
          borderRadius: 50, // Completely round edges (pill-shaped)
          fontWeight: 700, // Bolder text
          textTransform: "none", // Optional: Prevent uppercase transformation for cleaner look
          px: 3, // Extra horizontal padding for rounder feel
        }}
      >
        مشاهده لیست
      </Button>
    </Box>
  );
};

export default ActionButtons;
