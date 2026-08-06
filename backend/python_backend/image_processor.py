import cv2
import numpy as np
import base64
from typing import Dict, Any, Tuple, List, Optional
import math

class OpenCVImagePreprocessor:
    """
    Production-grade OpenCV Document Preprocessing & Quality Analysis Engine for Handwritten OCR.
    Handles Blur, Brightness, Resolution, Deskew, Perspective Warp, Denoising, CLAHE, and Bounded Cropping.
    """

    def __init__(
        self,
        blur_threshold: float = 100.0,
        min_brightness: float = 50.0,
        max_brightness: float = 240.0,
        min_dpi: int = 200,
        min_width: int = 800,
        min_height: int = 1000
    ):
        self.blur_threshold = blur_threshold
        self.min_brightness = min_brightness
        self.max_brightness = max_brightness
        self.min_dpi = min_dpi
        self.min_width = min_width
        self.min_height = min_height

    # --------------------------------------------------------------------------
    # 1. Image Quality Assessment
    # --------------------------------------------------------------------------

    def detect_blur(self, image: np.ndarray) -> Tuple[bool, float]:
        """
        Calculates Laplacian variance to measure focus/blur intensity.
        Variance < blur_threshold indicates blur.
        """
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
        blur_score = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        is_blurred = blur_score < self.blur_threshold
        return is_blurred, round(blur_score, 2)

    def detect_brightness(self, image: np.ndarray) -> Tuple[bool, bool, float]:
        """
        Measures mean lightness in HSV space.
        Returns (is_dark, is_overexposed, brightness_score)
        """
        if len(image.shape) == 3:
            hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
            brightness_score = float(np.mean(hsv[:, :, 2]))
        else:
            brightness_score = float(np.mean(image))

        is_dark = brightness_score < self.min_brightness
        is_overexposed = brightness_score > self.max_brightness
        return is_dark, is_overexposed, round(brightness_score, 2)

    def check_resolution(self, image: np.ndarray, estimated_dpi: int = 300) -> Tuple[bool, Dict[str, Any]]:
        """
        Checks pixel dimensions and estimated DPI against minimum thresholds.
        """
        height, width = image.shape[:2]
        is_width_ok = width >= self.min_width
        is_height_ok = height >= self.min_height
        is_dpi_ok = estimated_dpi >= self.min_dpi

        is_acceptable = is_width_ok and is_height_ok and is_dpi_ok

        details = {
            "width": width,
            "height": height,
            "estimated_dpi": estimated_dpi,
            "is_width_acceptable": is_width_ok,
            "is_height_acceptable": is_height_ok,
            "is_dpi_acceptable": is_dpi_ok,
            "aspect_ratio": round(width / float(height), 3)
        }
        return is_acceptable, details

    def assess_full_quality(self, image: np.ndarray, estimated_dpi: int = 300) -> Dict[str, Any]:
        """
        Comprehensive Quality Assessment aggregating Blur, Brightness, and Resolution checks.
        """
        is_blurred, blur_score = self.detect_blur(image)
        is_dark, is_overexposed, brightness_score = self.detect_brightness(image)
        is_res_ok, res_details = self.check_resolution(image, estimated_dpi)

        quality_issues = []
        if is_blurred:
            quality_issues.append(f"Image blurred (Laplacian variance: {blur_score} < {self.blur_threshold})")
        if is_dark:
            quality_issues.append(f"Image too dark (Mean brightness: {brightness_score} < {self.min_brightness})")
        if is_overexposed:
            quality_issues.append(f"Image overexposed (Mean brightness: {brightness_score} > {self.max_brightness})")
        if not is_res_ok:
            quality_issues.append(f"Low resolution ({res_details['width']}x{res_details['height']})")

        is_acceptable = (not is_blurred) and (not is_dark) and (not is_overexposed) and is_res_ok

        return {
            "is_acceptable": is_acceptable,
            "is_blurred": is_blurred,
            "blur_score": blur_score,
            "is_dark": is_dark,
            "is_overexposed": is_overexposed,
            "brightness_score": brightness_score,
            "resolution": res_details,
            "quality_issues": quality_issues
        }

    # --------------------------------------------------------------------------
    # 2. Deskew & Rotation Correction
    # --------------------------------------------------------------------------

    def calculate_skew_angle(self, image: np.ndarray) -> float:
        """
        Detects document skew angle using Hough line transformation or minAreaRect on binary text regions.
        """
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
        blur = cv2.GaussianBlur(gray, (5, 5), 0)
        thresh = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]

        # Find coordinates of all non-zero pixels
        pts = np.column_stack(np.where(thresh > 0))
        if len(pts) == 0:
            return 0.0

        rect = cv2.minAreaRect(pts)
        angle = rect[-1]

        if angle < -45:
            angle = -(90 + angle)
        else:
            angle = -angle

        return round(float(angle), 2)

    def deskew(self, image: np.ndarray, angle: Optional[float] = None) -> Tuple[np.ndarray, float]:
        """
        Rotates the image by the detected skew angle to straighten text lines.
        """
        if angle is None:
            angle = self.calculate_skew_angle(image)

        if abs(angle) < 0.2:
            return image, 0.0

        (h, w) = image.shape[:2]
        center = (w // 2, h // 2)
        M = cv2.getRotationMatrix2D(center, angle, 1.0)
        rotated = cv2.warpAffine(
            image, M, (w, h),
            flags=cv2.INTER_CUBIC,
            borderMode=cv2.BORDER_REPLICATE
        )
        return rotated, angle

    # --------------------------------------------------------------------------
    # 3. Perspective Correction (Four-Point Unwarp)
    # --------------------------------------------------------------------------

    def order_points(self, pts: np.ndarray) -> np.ndarray:
        """
        Orders coordinates: top-left, top-right, bottom-right, bottom-left.
        """
        rect = np.zeros((4, 2), dtype="float32")
        s = pts.sum(axis=1)
        rect[0] = pts[np.argmin(s)]
        rect[2] = pts[np.argmax(s)]

        diff = np.diff(pts, axis=1)
        rect[1] = pts[np.argmin(diff)]
        rect[3] = pts[np.argmax(diff)]
        return rect

    def perspective_correction(self, image: np.ndarray) -> Tuple[np.ndarray, bool]:
        """
        Finds document contour and applies four-point perspective warp.
        """
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        edged = cv2.Canny(blurred, 75, 200)

        contours, _ = cv2.findContours(edged.copy(), cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
        contours = sorted(contours, key=cv2.contourArea, reverse=True)[:5]

        doc_contour = None
        for c in contours:
            peri = cv2.arcLength(c, True)
            approx = cv2.approxPolyDP(c, 0.02 * peri, True)
            if len(approx) == 4:
                doc_contour = approx
                break

        if doc_contour is None:
            return image, False

        pts = doc_contour.reshape(4, 2)
        rect = self.order_points(pts)
        (tl, tr, br, bl) = rect

        # Calculate target width and height
        width_A = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
        width_B = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
        max_width = max(int(width_A), int(width_B))

        height_A = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
        height_B = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
        max_height = max(int(height_A), int(height_B))

        dst = np.array([
            [0, 0],
            [max_width - 1, 0],
            [max_width - 1, max_height - 1],
            [0, max_height - 1]
        ], dtype="float32")

        M = cv2.getPerspectiveTransform(rect, dst)
        warped = cv2.warpPerspective(image, M, (max_width, max_height))
        return warped, True

    # --------------------------------------------------------------------------
    # 4. Noise Removal & Contrast Enhancement (CLAHE)
    # --------------------------------------------------------------------------

    def remove_noise_and_enhance(
        self,
        image: np.ndarray,
        use_clahe: bool = True,
        use_denoising: bool = True
    ) -> np.ndarray:
        """
        Applies Bilateral Filter / Non-Local Means Denoising and CLAHE (Contrast Limited Adaptive Histogram Equalization).
        """
        processed = image.copy()

        if use_denoising:
            if len(processed.shape) == 3:
                processed = cv2.fastNlMeansDenoisingColored(processed, None, 10, 10, 7, 21)
            else:
                processed = cv2.fastNlMeansDenoising(processed, None, 10, 7, 21)

        if use_clahe:
            if len(processed.shape) == 3:
                lab = cv2.cvtColor(processed, cv2.COLOR_BGR2LAB)
                l, a, b = cv2.split(lab)
                clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
                cl = clahe.apply(l)
                limg = cv2.merge((cl, a, b))
                processed = cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)
            else:
                clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
                processed = clahe.apply(processed)

        return processed

    # --------------------------------------------------------------------------
    # 5. Region Bounding Cropping
    # --------------------------------------------------------------------------

    def crop_region(
        self,
        image: np.ndarray,
        bbox: Dict[str, int]
    ) -> np.ndarray:
        """
        Crops a specific rectangular box region from the image using standard bounding box dict:
        {"x": 10, "y": 20, "w": 300, "h": 50}
        """
        h_img, w_img = image.shape[:2]
        x = max(0, int(bbox.get("x", 0)))
        y = max(0, int(bbox.get("y", 0)))
        w = int(bbox.get("w", w_img - x))
        h = int(bbox.get("h", h_img - y))

        x_end = min(w_img, x + w)
        y_end = min(h_img, y + h)

        return image[y:y_end, x:x_end]

    # --------------------------------------------------------------------------
    # Master Pipeline Execution
    # --------------------------------------------------------------------------

    def process_pipeline(
        self,
        image: np.ndarray,
        enable_deskew: bool = True,
        enable_perspective: bool = True,
        enable_clahe: bool = True,
        enable_denoise: bool = True
    ) -> Dict[str, Any]:
        """
        Executes complete end-to-end preprocessing pipeline.
        """
        # Step 1: Quality Check
        quality = self.assess_full_quality(image)

        current_img = image.copy()
        perspective_applied = False
        deskew_angle = 0.0

        # Step 2: Perspective Correction
        if enable_perspective:
            current_img, perspective_applied = self.perspective_correction(current_img)

        # Step 3: Deskew
        if enable_deskew:
            current_img, deskew_angle = self.deskew(current_img)

        # Step 4: Denoising & CLAHE
        current_img = self.remove_noise_and_enhance(
            current_img,
            use_clahe=enable_clahe,
            use_denoising=enable_denoise
        )

        return {
            "quality_metrics": quality,
            "processed_image": current_img,
            "perspective_corrected": perspective_applied,
            "deskew_angle": deskew_angle,
            "final_width": current_img.shape[1],
            "final_height": current_img.shape[0]
        }


# Quick CLI / Script Demonstration Test
if __name__ == "__main__":
    preprocessor = OpenCVImagePreprocessor()
    # Create a dummy image for verification
    dummy = np.full((1500, 1200, 3), 200, dtype=np.uint8)
    cv2.putText(dummy, "TFrenzy OpenCV Preprocessor", (100, 200), cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 0, 0), 2)
    
    res = preprocessor.process_pipeline(dummy)
    print("OpenCV Pipeline Output:")
    print("Acceptable:", res["quality_metrics"]["is_acceptable"])
    print("Blur Score:", res["quality_metrics"]["blur_score"])
    print("Brightness Score:", res["quality_metrics"]["brightness_score"])
    print("Deskew Angle:", res["deskew_angle"])
    print("Final Dimensions:", f"{res['final_width']}x{res['final_height']}")
