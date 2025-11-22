import { Box, Typography } from "@mui/material";
import { Link } from "react-router-dom"; // Changed from next/link
import AnimatedEye from "@/components/animatedEye/AnimatedEye";

export default function AboutPage() {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        p: 2,
        gap: 4,
        backgroundColor: "black",
        color: "white",
        direction: "rtl",
      }}
      dir="rtl"
    >
      <AnimatedEye size={200} />
      <Box sx={{ textAlign: "center", maxWidth: 600 }}>
        <Typography variant="h4" gutterBottom>
          درباره پروژه
        </Typography>
        <Typography variant="body1" paragraph>
          این یک سازنده فرم پویا با React و Appwrite است. با استفاده از این
          ابزار، می‌توانید فرم‌های سفارشی بسازید، رکوردها ایجاد کنید و لیست‌ها
          را مشاهده نمایید.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          ویژگی‌ها: چت هوشمند، تم تاریک RTL، و پشتیبانی از فیلدهای متنوع.
        </Typography>
      </Box>
      <Link to="/" style={{ textDecoration: "none" }}>
        <Typography variant="body2" color="primary">
          بازگشت به صفحه اصلی
        </Typography>
      </Link>
    </Box>
  );
}
