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
        // FIXED: Column on mobile (xs), Row on tablet/desktop (sm)
        flexDirection: { xs: "column", sm: "row" },
        justifyContent: "center",
        alignItems: "center",
        mb: 4,
        gap: 2,
        width: "100%", // Ensure container takes full width
      }}
    >
      <Button
        variant="contained"
        onClick={onFormTypes}
        sx={{
          borderRadius: 50,
          fontWeight: 700,
          textTransform: "none",
          px: 3,
          py: 1.5, // Taller buttons for easier tapping
          // FIXED: Full width on mobile
          width: { xs: "100%", sm: "auto" },
        }}
      >
        مدیریت انواع فرم
      </Button>
      <Button
        variant="contained"
        onClick={onCreateRecord}
        sx={{
          borderRadius: 50,
          fontWeight: 700,
          textTransform: "none",
          px: 3,
          py: 1.5,
          // FIXED: Full width on mobile
          width: { xs: "100%", sm: "auto" },
        }}
      >
        ایجاد رکورد
      </Button>
      <Button
        variant="contained"
        onClick={onList}
        sx={{
          borderRadius: 50,
          fontWeight: 700,
          textTransform: "none",
          px: 3,
          py: 1.5,
          // FIXED: Full width on mobile
          width: { xs: "100%", sm: "auto" },
        }}
      >
        مشاهده لیست
      </Button>
    </Box>
  );
};

export default ActionButtons;
