# 🖼️ Collage Creator Pro

Collage Creator Pro is a responsive, dark-mode web application that allows users to quickly create custom image collages using various layout options and styling controls. Built entirely in a single HTML file with vanilla JavaScript and Tailwind CSS.

---

## ✨ Features

* **Dark Mode Interface:** Modern, easy-on-the-eyes dark theme.
* **Multiple Layouts:** Choose between **Masonry**, **Grid**, or **Row-based** layouts.
* **Customizable Parameters:** Control the number of columns/rows, spacing (**Gap**), and image corner rounding (**Radius**).
* **Export Settings:** Define the final output width and select the export format (**JPEG** or **PNG**).
* **Drag & Drop Support:** Easily upload multiple images by dragging them into the application, or use the file upload button.
* **Real-time Preview:** See the collage update instantly as you adjust the settings.
* **Image Management:** Reorder images via drag-and-drop in the sidebar thumbnails and shuffle the order randomly.
* **High-Resolution Output:** Generate the final image at a specified high resolution.

---

## 🚀 How to Use

### Start
Drag and drop your image files onto the main canvas area or use the **"Add Images"** button in the sidebar.

### Manage Images
* The sidebar will display thumbnails of all uploaded images.
* Drag and drop the thumbnails to reorder your images within the collage.
* Use the trash icon (**❌**) on any thumbnail to remove an image.
* Click **"Shuffle"** to randomize the image order.

### Configure Layout & Style
* In the **Layout** section, select a mode (Masonry, Grid, or Rows).
* Adjust the **Columns/Rows** count using the slider.
* In the **Styling** section, use the sliders to set the **Gap** (spacing between images) and the **Radius** (image corner curvature).
* Choose a **Background Color** for the canvas.

### Set Output
* In the **Output** section, set the desired final **Width** (e.g., 2000px for HD).
* Select the **Format** (JPEG or PNG) for export.

### Generate & Save
* Click the **"Done"** button in the header. The application will render the high-resolution image.
* In the results screen, click **"Save"** to download the file or **"Copy"** to copy the image to your clipboard.
* Click the Edit icon to return to the customization settings.

---

## 💻 Technical Stack

This application is fully self-contained in a single HTML file, utilizing:

* **HTML5/CSS3:** For structure and styling.
* **Tailwind CSS:** For utility-first styling and responsive design.
* **Vanilla JavaScript (ES6+):** Handles file processing, canvas rendering (using the Canvas API), image manipulation (cropping/resizing), and layout algorithms (Masonry, Grid, Row packing).
* **Lucide Icons:** Used for the application icons.

---

## ⚙️ Installation (Local Setup)

Since this is a single, self-contained HTML file:

1.  Clone this repository or copy the content of `index.html`.
2.  Save the code as `index.html` on your computer.
3.  Open `index.html` directly in any modern web browser (Chrome, Firefox, Edge, Safari). **No server is required.**
