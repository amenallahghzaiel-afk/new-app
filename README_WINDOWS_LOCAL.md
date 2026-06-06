# 🖥️ Restaurant Inventory Monitor — Windows Local Setup Guide
## دليل التشغيل والتحميل المحلي على نظام ويندوز 💻

Welcome! Follow this simple guide to download this application and run it locally on your Windows PC completely offline. It is fully integrated with browser file system persistence so all your changes can sync and read directly from a local JSON file on your desktop.

مرحباً بك! اتبع هذا الدليل البسيط لتحميل هذا التطبيق وتشغيله محلياً على جهاز الكمبيوتر الخاص بك (نظام ويندوز) دون الحاجة للاتصال بالإنترنت. يدعم التطبيق المزامنة المباشرة وحفظ البيانات تلقائياً على ملف في جهازك الشخصي.

---

## 📥 Step 1: Download the Application ZIP
### الخطوة 1: تحميل ملفات التطبيق بصيغة ZIP

1. At the very top right corner of the **Google AI Studio** interface, click the **Settings (Gear Icon ⚙️)**.
2. Under the settings menu, look for **Export** or **Download ZIP**.
3. Click to download the entire custom applet workspace as a compressed `.zip` archive.
4. Extract the `.zip` file into a directory on your computer (e.g., `C:\RestaurantInventory`).

1. في الزاوية العلوية اليمنى من واجهة **Google AI Studio**، انقر على **أيقونة الإعدادات (الترس ⚙️)**.
2. ابحث عن خيار **تصدير (Export)** أو **تحميل الملفات كـ ZIP (Download ZIP)**.
3. قم بتحميل الملف المضغوط وفك الضغط عنه في مجلد خاص على جهازك (مثال: `C:\RestaurantInventory`).

---

## 🛠️ Step 2: One-Click Environment Setup
### الخطوة 2: تثبيت بيئة العمل بنقرة واحدة

We have created an automated setup wizard helper script that verifies your environment, downloads developer assets, and sets up configuration variables automatically.

لقد قمنا بإعداد ملف برمجي مؤتمت لمساعدتك في التحقق من وجود المتطلبات وتثبيت الحزم البرمجية تلقائياً.

1. Double-click the file named: **`setup-windows.bat`**.
2. **Note on Node.js**: The script will verify if Node.js (the lightweight runtime environment for modern apps) is installed:
   - If **installed**, it will proceed immediately.
   - If **not installed**, it will gracefully open the official **[Node.js Prebuilt Installer Page](https://nodejs.org)**. Simply download the **LTS standard installation package**, run the installer, close your window, and restart the `setup-windows.bat` script!
3. Wait for the script to finish downloading standard runtime libraries. Once successful, it will print **"SETUP COMPLETE AND SUCCESSFUL!"**.

1. انقر نقراً مزدوجاً على الملف: **`setup-windows.bat`**.
2. **ملاحظة حول لغة Node.js**: سيقوم الملف بالتحقق من تثبيت بيئة جافا سكريبت على القرص:
   - في حال كانت **مثبتة مسبقاً**، سيبدأ تثبيت الحزم فوراً.
   - في حال **لم تكن مثبتة**، سيقوم بفتح صفحة التحميل الرسمية لـ **[Node.js](https://nodejs.org)**. قم بتحميل النسخة القياسية (LTS) وتثبيتها، ثم أعد تشغيل ملف المساعدة `setup-windows.bat`.
3. انتظر حتى ينتهي المعالج من تنزيل الحزم وتحضير البيئة وظهور عبارة **"SETUP COMPLETE AND SUCCESSFUL!"**.

---

## 🚀 Step 3: Run the Application Locally!
### الخطوة 3: تشغيل التطبيق محلياً وبسهولة!

Now you can run the application anytime without installing any other tools!

الآن يمكنك تشغيل النظام والعمل عليه في أي وقت دون الحاجة لخطوات إضافية:

1. Double-click the file named: **`run-app.bat`**.
2. This will instantly activate the secure local processing server and **automatically launch your default web browser** to:
   👉 **`http://localhost:3000`**
3. **Important**: Keep the command window console open while using the application! Closing this window will turn off the local server.

1. انقر نقراً مزدوجاً على الملف: **`run-app.bat`**.
2. سيقوم هذا الملف بتشغيل خادم المعالجة المحلي الآمن و**فتح متصفح الإنترنت الافتراضي لديك تلقائياً** على الرابط التالي:
   👉 **`http://localhost:3000`**
3. **تنبيه هام**: يرجى الحفاظ على نافذة موجه الأوامر (Command Prompt) مفتوحة أثناء العمل على التطبيق لإبقاء الخادم نشطاً.

---

## 💾 Local Synchronized Files Guide
### دليل ربط وحفظ البيانات محلياً على جهازك

Your application features full-fidelity database-oriented storage in simple text files. We recommend selecting a permanent file location:

يحتوي التطبيق على ميزة متطورة لحفظ البيانات ومزامنتها على جهازك الشخصي لتفادي فقدانها وتصديرها بصيغة JSON. يوصى باتباع الخطوات التالية:

1. In the sidebar, under the **Backup / Local Space (النسخ الاحتياطي / البيئة المحلية)** widget, click **Link Local File (ربط ملف محلي)**.
2. Select or create a directory path like `Document/inventory.json` on your PC.
3. This creates a secure persistent link, meaning every delivery log, stock check, report, or menu modification writes directly to that location on your hard drive!
4. Clear instructions on PDF report generation (Print Reports) can also be easily rendered by clicking print triggers within any tab.

1. في شريط التنقل الجانبي، ومن خلاية صندوق **النسخ الاحتياطي والبيئة المحلية**، انقر على **ربط الملف المحلي (Link Local File)**.
2. حدد ملفاً أو قم بإنشاء ملف نصي جديد مثل `Document/inventory.json` على حاسوبك الشخصي.
3. سيقوم المتصفح بربط التطبيق بهذا الملف، وبذلك يتم كتابة وحفظ كل حركة مخزنية، تسوية جرد، أو تعديل قائمة طعام عليه مباشرة وبشكل آمن!
4. يمكنك كذلك طباعة أي تقرير كملف PDF عالي الجودة بمجرد النقر على زري الطباعة في الصفحات المختلفة.

Enjoy your offline, high-speed, local inventory workspace! 🎉
استمتع بتجربة إدارة مخازن مرنة وسريعة ومستقلة تماماً! 🎉
