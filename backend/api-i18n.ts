import type http from 'node:http';
import { type BotLang, resolveBotLang } from './bot-engine.js';

export type ApiMessageKey =
	| 'FORBIDDEN_GROUP'
	| 'UNAUTHORIZED_OWNER'
	| 'FORBIDDEN_BOT'
	| 'GROUP_NOT_FOUND'
	| 'BOT_NOT_FOUND'
	| 'INVALID_TOKEN_FORMAT'
	| 'INVALID_TELEGRAM_TOKEN'
	| 'INVALID_INIT_DATA'
	| 'SESSION_EXPIRED'
	| 'INVALID_OWNER_PASSWORD'
	| 'RATE_LIMIT_LOGIN'
	| 'RATE_LIMIT_EXCEEDED'
	| 'INTERNAL_SERVER_ERROR'
	| 'INVALID_USER_ID'
	| 'SUBSCRIPTION_ACTIVATED'
	| 'REPORT_SENT_SUCCESS'
	| 'GDPR_PURGED'
	| 'GROUP_ADMIN_REQUIRED'
	| 'GROUP_LINK_REQUIRED'
	| 'STARS_INVOICE_ERROR'
	| 'PRIVATE_GROUP_ADMIN_PROMPT'
	| 'GROUP_NOT_FOUND_OR_NOT_ADMIN'
	| 'BOT_INFO_CHANGE_WARNING'
	| 'SETTINGS_SAVED_SUCCESS'
	| 'BOT_DELETED_SUCCESS'
	| 'GROUP_DELETED_SUCCESS';

export const API_MESSAGES: Record<ApiMessageKey, Record<BotLang, string>> = {
	FORBIDDEN_GROUP: {
		fa: 'شما دسترسی به مدیریت این گروه را ندارید.',
		en: 'You do not have permission to manage this group.',
		ar: 'ليس لديك إذن لإدارة هذه المجموعة.',
		ru: 'У вас нет прав на управление этой группой.',
		tr: 'Bu grubu yönetme yetkiniz yok.',
		es: 'No tienes permiso para administrar este grupo.',
		pt: 'Você não tem permissão para gerenciar este grupo.',
		de: 'Sie haben keine Berechtigung, diese Gruppe zu verwalten.',
		fr: "Vous n'avez pas l'autorisation de gérer ce groupe.",
		zh: '您没有管理此群组的权限。',
	},
	UNAUTHORIZED_OWNER: {
		fa: 'دسترسی غیرمجاز. فقط مدیر کل پلتفرم (Owner) مجاز به انجام این عملیات است.',
		en: 'Unauthorized access. Only the platform owner is permitted to perform this operation.',
		ar: 'وصول غير مصرح به. مالك المنصة فقط هو المخول لتنفيذ هذه العملية.',
		ru: 'Несанкционированный доступ. Только владелец платформы имеет право выполнять эту операцию.',
		tr: 'Yetkisiz erişim. Bu işlemi yalnızca platform sahibi gerçekleştirebilir.',
		es: 'Acceso no autorizado. Solo el propietario de la plataforma puede realizar esta operación.',
		pt: 'Acesso não autorizado. Apenas o proprietário da plataforma pode realizar esta operação.',
		de: 'Unbefugter Zugriff. Nur der Plattforminhaber ist berechtigt, diesen Vorgang durchzuführen.',
		fr: "Accès non autorisé. Seul le propriétaire de la plateforme peut effectuer cette opération.",
		zh: '未经授权的访问。只有平台所有者才能执行此操作。',
	},
	FORBIDDEN_BOT: {
		fa: 'شما دسترسی به مدیریت این ربات را ندارید.',
		en: 'You do not have permission to manage this bot.',
		ar: 'ليس لديك إذن لإدارة هذا البوت.',
		ru: 'У вас нет прав на управление этим ботом.',
		tr: 'Bu botu yönetme yetkiniz yok.',
		es: 'No tienes permiso para administrar este bot.',
		pt: 'Você não tem permissão para gerenciar este bot.',
		de: 'Sie haben keine Berechtigung, diesen Bot zu verwalten.',
		fr: "Vous n'avez pas l'autorisation de gérer ce bot.",
		zh: '您没有管理此机器人的权限。',
	},
	GROUP_NOT_FOUND: {
		fa: 'گروه یافت نشد.',
		en: 'Group not found.',
		ar: 'المجموعة غير موجودة.',
		ru: 'Группа не найдена.',
		tr: 'Grup bulunamadı.',
		es: 'Grupo no encontrado.',
		pt: 'Grupo não encontrado.',
		de: 'Gruppe nicht gefunden.',
		fr: 'Groupe introuvable.',
		zh: '未找到群组。',
	},
	BOT_NOT_FOUND: {
		fa: 'ربات یافت نشد.',
		en: 'Bot not found.',
		ar: 'البوت غير موجود.',
		ru: 'Бот не найден.',
		tr: 'Bot bulunamadı.',
		es: 'Bot no encontrado.',
		pt: 'Bot não encontrado.',
		de: 'Bot nicht gefunden.',
		fr: 'Bot introuvable.',
		zh: '未找到机器人。',
	},
	INVALID_TOKEN_FORMAT: {
		fa: 'فرمت توکن معتبر نیست (مثال: 123456789:AAH...). لطفاً توکن دریافتی از @BotFather را کامل وارد کنید.',
		en: 'Invalid token format (e.g. 123456789:AAH...). Please enter the full token from @BotFather.',
		ar: 'تنسيق الرمز غير صالح (مثال: 123456789:AAH...). يرجى إدخال الرمز الكامل المستلم من @BotFather.',
		ru: 'Неверный формат токена (например: 123456789:AAH...). Введите полный токен от @BotFather.',
		tr: 'Geçersiz belirteç formatı (örneğin: 123456789:AAH...). Lütfen @BotFather tarafından verilen tam belirteci girin.',
		es: 'Formato de token no válido (ejemplo: 123456789:AAH...). Introduce el token completo de @BotFather.',
		pt: 'Formato de token inválido (exemplo: 123456789:AAH...). Insira o token completo recebido do @BotFather.',
		de: 'Ungültiges Token-Format (z. B. 123456789:AAH...). Bitte geben Sie das vollständige Token von @BotFather ein.',
		fr: 'Format de jeton non valide (ex. : 123456789:AAH...). Veuillez saisir le jeton complet de @BotFather.',
		zh: '令牌格式无效（例如：123456789:AAH...）。请输入来自 @BotFather 的完整令牌。',
	},
	INVALID_TELEGRAM_TOKEN: {
		fa: 'توکن وارد شده در تلگرام معتبر نیست یا توسط @BotFather باطل شده است. لطفاً یک توکن معتبر از @BotFather دریافت کنید.',
		en: 'The entered token is invalid on Telegram or has been revoked by @BotFather. Please obtain a valid token from @BotFather.',
		ar: 'الرمز المدخل غير صالح على تيليجرام أو تم إلغاؤه بواسطة @BotFather. يرجى الحصول على رمز صالح من @BotFather.',
		ru: 'Введенный токен недействителен в Telegram или отозван @BotFather. Получите действительный токен от @BotFather.',
		tr: "Girilen belirteç Telegram'da geçersiz veya @BotFather tarafından iptal edilmiş. Lütfen @BotFather'dan geçerli bir belirteç alın.",
		es: 'El token ingresado no es válido en Telegram o fue revocado por @BotFather. Obtén un token válido de @BotFather.',
		pt: 'O token inserido é inválido no Telegram ou foi revogado pelo @BotFather. Obtenha um token válido do @BotFather.',
		de: 'Das eingegebene Token ist bei Telegram ungültig oder wurde von @BotFather widerrufen. Bitte fordern Sie ein gültiges Token an.',
		fr: 'Le jeton saisi est invalide sur Telegram ou a été révoqué par @BotFather. Veuillez obtenir un jeton valide.',
		zh: '输入的令牌在 Telegram 上无效或已被 @BotFather 撤销。请从 @BotFather 获取有效令牌。',
	},
	INVALID_INIT_DATA: {
		fa: 'اعتبارسنجی ورود تلگرام ناموفق بود. امضای دیجیتال initData معتبر نیست.',
		en: 'Telegram authentication failed. Invalid initData signature.',
		ar: 'فشلت المصادقة مع تيليجرام. توقيع initData الرقمي غير صالح.',
		ru: 'Ошибка аутентификации Telegram. Недействительная цифровая подпись initData.',
		tr: 'Telegram kimlik doğrulaması başarısız oldu. Geçersiz initData imzası.',
		es: 'Falló la autenticación de Telegram. Firma initData no válida.',
		pt: 'Falha na autenticação do Telegram. Assinatura do initData inválida.',
		de: 'Telegram-Authentifizierung fehlgeschlagen. Ungültige initData-Signatur.',
		fr: "Échec de l'authentification Telegram. Signature initData invalide.",
		zh: 'Telegram 身份验证失败。无效的 initData 签名。',
	},
	SESSION_EXPIRED: {
		fa: 'داده‌های نشست تلگرام منقضی شده‌اند. لطفاً مینی‌اپ را مجدداً باز کنید.',
		en: 'Telegram session has expired. Please reopen the Mini App.',
		ar: 'انتهت صلاحية جلسة تيليجرام. يرجى إعادة فتح التطبيق المصغر.',
		ru: 'Сессия Telegram истекла. Пожалуйста, откройте Mini App заново.',
		tr: "Telegram oturumunun süresi doldu. Lütfen Mini App'i yeniden açın.",
		es: 'La sesión de Telegram ha caducado. Vuelve a abrir la Mini App.',
		pt: 'A sessão do Telegram expirou. Reabra o Mini App.',
		de: 'Die Telegram-Sitzung ist abgelaufen. Bitte öffnen Sie die Mini App erneut.',
		fr: 'La session Telegram a expiré. Veuillez rouvrir la Mini App.',
		zh: 'Telegram 会话已过期。请重新打开 Mini App。',
	},
	INVALID_OWNER_PASSWORD: {
		fa: 'رمز امنیتی نامعتبر است.',
		en: 'Invalid security password.',
		ar: 'كلمة المرور الأمنية غير صالحة.',
		ru: 'Неверный пароль безопасности.',
		tr: 'Geçersiz güvenlik şifresi.',
		es: 'Contraseña de seguridad no válida.',
		pt: 'Senha de segurança inválida.',
		de: 'Ungültiges Sicherheitspasswort.',
		fr: 'Mot de passe de sécurité incorrect.',
		zh: '安全密码无效。',
	},
	RATE_LIMIT_LOGIN: {
		fa: 'تعداد تلاش‌های ناموفق بیش از حد مجاز است. لطفاً چند دقیقه دیگر تلاش کنید.',
		en: 'Too many failed login attempts. Please try again in a few minutes.',
		ar: 'عدد محاولات تسجيل الدخول الفاشلة تجاوز الحد المسموح. يرجى المحاولة بعد بضع دقائق.',
		ru: 'Слишком много неудачных попыток входа. Повторите попытку через несколько минут.',
		tr: 'Çok fazla başarısız giriş denemesi. Lütfen birkaç dakika sonra tekrar deneyin.',
		es: 'Demasiados intentos fallidos. Inténtalo de nuevo en unos minutos.',
		pt: 'Muitas tentativas falhas. Tente novamente em alguns minutos.',
		de: 'Zu viele fehlgeschlagene Anmeldeversuche. Bitte versuchen Sie es in wenigen Minuten erneut.',
		fr: 'Trop de tentatives infructueuses. Veuillez réessayer dans quelques minutes.',
		zh: '失败的登录尝试过多。请在几分钟后重试。',
	},
	RATE_LIMIT_EXCEEDED: {
		fa: 'تعداد درخواست‌ها بیش از حد مجاز است. لطفاً چند لحظه بعد تلاش کنید.',
		en: 'Too many requests. Please wait a moment and try again.',
		ar: 'تم تجاوز الحد المسموح من الطلبات. يرجى الانتظار قليلاً والمحاولة مجدداً.',
		ru: 'Превышен лимит запросов. Пожалуйста, подождите немного и повторите.',
		tr: 'Çok fazla istek yapıldı. Lütfen biraz bekleyip tekrar deneyin.',
		es: 'Demasiadas solicitudes. Espera un momento y vuelve a intentarlo.',
		pt: 'Muitas solicitações. Aguarde um momento e tente novamente.',
		de: 'Zu viele Anfragen. Bitte warten Sie einen Moment und versuchen Sie es erneut.',
		fr: 'Trop de requêtes. Veuillez patienter un instant et réessayer.',
		zh: '请求过多。请稍候再试。',
	},
	INTERNAL_SERVER_ERROR: {
		fa: 'خطای غیرمنتظره در سرور رخ داده است. لطفاً بعداً تلاش کنید.',
		en: 'An unexpected server error occurred. Please try again later.',
		ar: 'حدث خطأ غير متوقع في الخادم. يرجى المحاولة لاحقاً.',
		ru: 'Произошла непредвиденная ошибка сервера. Повторите попытку позже.',
		tr: 'Beklenmeyen bir sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.',
		es: 'Ocurrió un error inesperado en el servidor. Inténtalo de nuevo más tarde.',
		pt: 'Ocorreu um erro inesperado no servidor. Tente novamente mais tarde.',
		de: 'Ein unerwarteter Serverfehler ist aufgetreten. Bitte versuchen Sie es später erneut.',
		fr: 'Une erreur de serveur inattendue est survenue. Veuillez réessayer plus tard.',
		zh: '服务器发生意外错误。请稍后重试。',
	},
	INVALID_USER_ID: {
		fa: 'شناسه کاربری نامعتبر است.',
		en: 'Invalid user ID.',
		ar: 'معرف المستخدم غير صالح.',
		ru: 'Недействительный идентификатор пользователя.',
		tr: 'Geçersiz kullanıcı kimliği.',
		es: 'ID de usuario no válido.',
		pt: 'ID de usuário inválido.',
		de: 'Ungültige Benutzer-ID.',
		fr: 'Identifiant utilisateur non valide.',
		zh: '无效的用户 ID。',
	},
	SUBSCRIPTION_ACTIVATED: {
		fa: 'اشتراک ماهانه گروه با موفقیت فعال شد.',
		en: 'Monthly group subscription has been activated successfully.',
		ar: 'تم تفعيل الاشتراك الشهري للمجموعة بنجاح.',
		ru: 'Месячная подписка группы успешно активирована.',
		tr: 'Aylık grup aboneliği başarıyla etkinleştirildi.',
		es: 'La suscripción mensual del grupo se ha activado correctamente.',
		pt: 'A assinatura mensal do grupo foi ativada com sucesso.',
		de: 'Monatsabonnement der Gruppe wurde erfolgreich aktiviert.',
		fr: "L'abonnement mensuel du groupe a été activé avec succès.",
		zh: '群组按月订阅已成功激活。',
	},
	REPORT_SENT_SUCCESS: {
		fa: 'گزارش عملکرد گروه با موفقیت به تلگرام شما ارسال شد.',
		en: 'Group analytics report has been sent to your Telegram successfully.',
		ar: 'تم إرسال تقرير أداء المجموعة إلى تيليجرام الخاص بك بنجاح.',
		ru: 'Отчет о работе группы успешно отправлен в ваш Telegram.',
		tr: 'Grup analiz raporu Telegram hesabınıza başarıyla gönderildi.',
		es: 'El informe de rendimiento del grupo se ha enviado a tu Telegram con éxito.',
		pt: 'O relatório de desempenho do grupo foi enviado com sucesso para o seu Telegram.',
		de: 'Der Gruppenbericht wurde erfolgreich an Ihr Telegram gesendet.',
		fr: 'Le rapport de performance du groupe a été envoyé sur votre Telegram avec succès.',
		zh: '群组分析报告已成功发送至您的 Telegram。',
	},
	GDPR_PURGED: {
		fa: 'تمامی اطلاعات حساب شما طبق استاندارد GDPR پاکسازی شد.',
		en: 'All your account data has been purged in accordance with GDPR.',
		ar: 'تم مسح جميع بيانات حسابك وفقاً لمعايير GDPR.',
		ru: 'Все данные вашей учетной записи удалены в соответствии с GDPR.',
		tr: 'Hesap verileriniz GDPR standartlarına uygun olarak temizlendi.',
		es: 'Todos los datos de tu cuenta han sido eliminados de acuerdo con el RGPD.',
		pt: 'Todos os dados da sua conta foram excluídos de acordo com o GDPR.',
		de: 'Alle Ihre Kontodaten wurden gemäß DSGVO gelöscht.',
		fr: 'Toutes les données de votre compte ont été purgées conformément au RGPD.',
		zh: '您的所有账户数据已根据 GDPR 标准完全清除。',
	},
	GROUP_ADMIN_REQUIRED: {
		fa: 'ربات برای تغییر تنظیمات گروه در تلگرام نیاز به دسترسی ادمین دارد.',
		en: 'The bot requires administrator privileges in the group on Telegram.',
		ar: 'يحتاج البوت إلى صلاحيات المشرف في المجموعة على تيليجرام.',
		ru: 'Боту требуются права администратора в группе Telegram.',
		tr: "Botun Telegram'daki grupta yönetici yetkilerine ihtiyacı var.",
		es: 'El bot requiere permisos de administrador en el grupo en Telegram.',
		pt: 'O bot requer privilégios de administrador no grupo do Telegram.',
		de: 'Der Bot benötigt Administratorrechte in der Gruppe auf Telegram.',
		fr: "Le bot nécessite des privilèges d'administrateur dans le groupe Telegram.",
		zh: '机器人需要 Telegram 群组中的管理员权限。',
	},
	GROUP_LINK_REQUIRED: {
		fa: 'لطفاً آیدی یا لینک گروه تلگرام خود را وارد کنید (مثال: @my_group).',
		en: 'Please enter your Telegram group username or link (e.g. @my_group).',
		ar: 'يرجى إدخال معرف أو رابط مجموعة تيليجرام الخاصة بك (مثال: @my_group).',
		ru: 'Пожалуйста, введите юзернейм или ссылку на вашу группу в Telegram (например: @my_group).',
		tr: 'Lütfen Telegram grubunuzun kullanıcı adını veya bağlantısını girin (örnek: @my_group).',
		es: 'Introduce el nombre de usuario o enlace de tu grupo de Telegram (ej. @my_group).',
		pt: 'Insira o nome de usuário ou link do seu grupo do Telegram (ex.: @my_group).',
		de: 'Bitte geben Sie den Benutzernamen oder Link Ihrer Telegram-Gruppe ein (z. B. @my_group).',
		fr: "Veuillez saisir le nom d'utilisateur ou le lien de votre groupe Telegram (ex. : @my_group).",
		zh: '请输入您的 Telegram 群组用户名或链接（例如：@my_group）。',
	},
	STARS_INVOICE_ERROR: {
		fa: 'خطا در ایجاد فاکتور پرداخت استارز از سرور تلگرام. لطفاً اتصال ربات را بررسی کنید.',
		en: 'Failed to create Telegram Stars invoice. Please check the bot connection.',
		ar: 'فشل إنشاء فاتورة نجوم تيليجرام. يرجى التحقق من اتصال البوت.',
		ru: 'Не удалось создать счет Telegram Stars. Проверьте подключение бота.',
		tr: 'Telegram Stars faturası oluşturulamadı. Lütfen bot bağlantısını kontrol edin.',
		es: 'Error al crear la factura de Telegram Stars. Comprueba la conexión del bot.',
		pt: 'Falha ao criar fatura do Telegram Stars. Verifique a conexão do bot.',
		de: 'Fehler beim Erstellen der Telegram Stars-Rechnung. Bitte Bot-Verbindung prüfen.',
		fr: 'Échec de création de la facture Telegram Stars. Veuillez vérifier la connexion du bot.',
		zh: '创建 Telegram Stars 发票失败。请检查机器人连接。',
	},
	PRIVATE_GROUP_ADMIN_PROMPT: {
		fa: 'برای گروه‌های خصوصی (لینک دعوت +)، ابتدا باید ربات را به گروه اضافه و ادمین کنید، یا آیدی عمومی (@username) گروه را وارد کنید.',
		en: 'For private groups (invite links with +), you must first add the bot to the group as administrator, or enter the public username (@username).',
		ar: 'بالنسبة للمجموعات الخاصة (روابط الدعوة +)، يجب أولاً إضافة البوت إلى المجموعة كمشرف، أو إدخال المعرف العام (@username).',
		ru: 'Для частных групп (ссылки-приглашения с +) сначала добавьте бота в группу администратором или укажите публичный юзернейм (@username).',
		tr: 'Gizli gruplar için (+ ile başlayan davet bağlantıları), önce botu gruba yönetici olarak eklemeli veya genel kullanıcı adını (@username) girmelisiniz.',
		es: 'Para grupos privados (enlaces de invitación con +), primero debes agregar el bot al grupo como administrador, o ingresar el nombre de usuario público (@username).',
		pt: 'Para grupos privados (links de convite com +), primeiro adicione o bot ao grupo como administrador ou insira o nome de usuário público (@username).',
		de: 'Für private Gruppen (Einladungslinks mit +) müssen Sie den Bot zuerst als Administrator zur Gruppe hinzufügen oder den öffentlichen Benutzernamen (@username) eingeben.',
		fr: "Pour les groupes privés (liens d'invitation avec +), vous devez d'abord ajouter le bot au groupe en tant qu'administrateur ou saisir le nom d'utilisateur public (@username).",
		zh: '对于私有群组（带 + 的邀请链接），您必须先将机器人作为管理员添加到群组中，或输入公开用户名（@username）。',
	},
	GROUP_NOT_FOUND_OR_NOT_ADMIN: {
		fa: 'گروه در تلگرام یافت نشد یا ربات ادمین گروه نیست. لطفاً ربات را در گروه ادمین کنید.',
		en: 'Group was not found on Telegram or the bot is not an admin. Please promote the bot to admin in the group.',
		ar: 'لم يتم العثور على المجموعة على تيليجرام أو أن البوت ليس مشرفاً. يرجى ترقية البوت إلى مشرف في المجموعة.',
		ru: 'Группа не найдена в Telegram или бот не является администратором. Пожалуйста, назначьте бота администратором.',
		tr: 'Grup Telegram\'da bulunamadı veya bot yönetici değil. Lütfen botu grupta yönetici yapın.',
		es: 'No se encontró el grupo en Telegram o el bot no es administrador. Asigna al bot como administrador en el grupo.',
		pt: 'O grupo não foi encontrado no Telegram ou o bot não é administrador. Promova o bot a administrador no grupo.',
		de: 'Gruppe wurde auf Telegram nicht gefunden oder der Bot ist kein Admin. Bitte befördern Sie den Bot in der Gruppe zum Administrator.',
		fr: "Le groupe n'a pas été trouvé sur Telegram ou le bot n'est pas administrateur. Veuillez promouvoir le bot en administrateur.",
		zh: '在 Telegram 上未找到该群组，或机器人不是管理员。请将机器人提升为群组管理员。',
	},
	BOT_INFO_CHANGE_WARNING: {
		fa: 'ربات برای تغییر نام/بیوگرافی در تلگرام نیاز به دسترسی «Change Group Info» (تغییر اطلاعات گروه) دارد.',
		en: 'The bot requires "Change Group Info" permission on Telegram to update the title/bio.',
		ar: 'يحتاج البوت إلى إذن "تغيير معلومات المجموعة" على تيليجرام لتحديث العنوان أو السيرة الذاتية.',
		ru: 'Боту требуется разрешение «Изменение профиля группы» в Telegram для обновления названия/описания.',
		tr: 'Botun başlığı/biyografiyi güncellemek için Telegram\'da "Grup Bilgilerini Değiştir" iznine ihtiyacı vardır.',
		es: 'El bot requiere el permiso "Cambiar información del grupo" en Telegram para actualizar el título/biografía.',
		pt: 'O bot requer a permissão "Alterar Informações do Grupo" no Telegram para atualizar o título/biografia.',
		de: 'Der Bot benötigt die Berechtigung „Gruppeninfo ändern“ auf Telegram, um Titel/Beschreibung zu aktualisieren.',
		fr: 'Le bot nécessite l\'autorisation "Modifier les infos du groupe" sur Telegram pour modifier le titre/la bio.',
		zh: '机器人需要 Telegram 上的“更改群组信息”权限才能更新标题/简介。',
	},
	SETTINGS_SAVED_SUCCESS: {
		fa: 'تنظیمات با موفقیت ذخیره شد.',
		en: 'Settings saved successfully.',
		ar: 'تم حفظ الإعدادات بنجاح.',
		ru: 'Настройки успешно сохранены.',
		tr: 'Ayarlar başarıyla kaydedildi.',
		es: 'Configuración guardada correctamente.',
		pt: 'Configurações salvas com sucesso.',
		de: 'Einstellungen erfolgreich gespeichert.',
		fr: 'Paramètres enregistrés avec succès.',
		zh: '设置保存成功。',
	},
	BOT_DELETED_SUCCESS: {
		fa: 'ربات با موفقیت از سیستم حذف شد.',
		en: 'Bot was removed from the system successfully.',
		ar: 'تمت إزالة البوت من النظام بنجاح.',
		ru: 'Бот успешно удален из системы.',
		tr: 'Bot sistemden başarıyla kaldırıldı.',
		es: 'El bot se eliminó del sistema con éxito.',
		pt: 'O bot foi removido do sistema com sucesso.',
		de: 'Der Bot wurde erfolgreich aus dem System entfernt.',
		fr: 'Le bot a été supprimé du système avec succès.',
		zh: '机器人已成功从系统中移除。',
	},
	GROUP_DELETED_SUCCESS: {
		fa: 'گروه با موفقیت از سیستم مینی‌گارد حذف شد.',
		en: 'Group was removed from MiniGuard system successfully.',
		ar: 'تمت إزالة المجموعة من نظام MiniGuard بنجاح.',
		ru: 'Группа успешно удалена из системы MiniGuard.',
		tr: 'Grup MiniGuard sisteminden başarıyla kaldırıldı.',
		es: 'El grupo se eliminó del sistema MiniGuard con éxito.',
		pt: 'O grupo foi removido do sistema MiniGuard com sucesso.',
		de: 'Die Gruppe wurde erfolgreich aus dem MiniGuard-System entfernt.',
		fr: 'Le groupe a été supprimé du système MiniGuard avec succès.',
		zh: '群组已成功从 MiniGuard 系统中移除。',
	},
};

export function resolveRequestLang(req: http.IncomingMessage): BotLang {
	try {
		// 1. Explicit header from client: X-Request-Lang
		const customLang = req.headers['x-request-lang'];
		if (typeof customLang === 'string' && customLang) {
			return resolveBotLang(customLang);
		}

		// 2. Query parameter: ?lang=...
		const urlObj = new URL(req.url || '/', 'http://localhost');
		const qLang = urlObj.searchParams.get('lang');
		if (qLang) {
			return resolveBotLang(qLang);
		}

		// 3. Telegram WebApp initData header
		const initDataHeader = req.headers['x-telegram-init-data'];
		if (typeof initDataHeader === 'string' && initDataHeader) {
			const params = new URLSearchParams(initDataHeader);
			const userStr = params.get('user');
			if (userStr) {
				const user = JSON.parse(userStr);
				if (user.language_code) {
					return resolveBotLang(user.language_code);
				}
			}
		}

		// 4. Standard Accept-Language header
		const acceptLang = req.headers['accept-language'];
		if (typeof acceptLang === 'string' && acceptLang) {
			const primary = acceptLang.split(',')[0]?.split(';')[0]?.trim();
			if (primary) {
				return resolveBotLang(primary);
			}
		}
	} catch {}

	return 'fa';
}

export function getApiMessage(
	key: ApiMessageKey,
	reqOrLang: http.IncomingMessage | BotLang,
): string {
	const lang: BotLang =
		typeof reqOrLang === 'string' ? reqOrLang : resolveRequestLang(reqOrLang);
	const entry = API_MESSAGES[key];
	if (!entry) return key;
	return entry[lang] || entry.en || entry.fa;
}

export function getLocalizedSubscriptionPackages(lang: BotLang, monthlyPrice: number = 100) {
	const packagesData: Record<
		BotLang,
		Array<{ id: string; name: string; duration_days: number; price_stars: number; features: string[] }>
	> = {
		fa: [
			{
				id: 'pkg_trial_24h',
				name: '۲۴ ساعت تست رایگان (تمام قابلیت‌ها)',
				duration_days: 1,
				price_stars: 0,
				features: [
					'ساخت ربات اختصاصی با نام دلخواه',
					'بیش از ۱۰۰ قابلیت فایروال و ضداسپم',
					'گزارش آمار روزانه در پیوی ادمین',
				],
			},
			{
				id: 'pkg_monthly_100',
				name: `اشتراک ماهانه ۱ گروه (${monthlyPrice} استارز)`,
				duration_days: 30,
				price_stars: monthlyPrice,
				features: [
					'حفاظت ۲۴/۷ بدون وقفه برای ۱ گروه اختصاصی',
					'پشتیبانی از تمامی ۱۰۰+ ماژول امنیتی',
					'نگهداری اطلاعات تا ۱ هفته پس از انقضا (Safe Hibernation)',
				],
			},
		],
		en: [
			{
				id: 'pkg_trial_24h',
				name: '24-Hour Free Trial (All Features)',
				duration_days: 1,
				price_stars: 0,
				features: [
					'Build dedicated bot with custom name',
					'100+ firewall & anti-spam modules',
					'Daily analytics report in admin PM',
				],
			},
			{
				id: 'pkg_monthly_100',
				name: `1-Group Monthly Subscription (${monthlyPrice} Stars)`,
				duration_days: 30,
				price_stars: monthlyPrice,
				features: [
					'24/7 uninterrupted protection for 1 dedicated group',
					'Full access to all 100+ security modules',
					'Data preserved for 1 week after expiry (Safe Hibernation)',
				],
			},
		],
		ar: [
			{
				id: 'pkg_trial_24h',
				name: 'تجربة مجانية لمدة 24 ساعة (جميع الميزات)',
				duration_days: 1,
				price_stars: 0,
				features: [
					'إنشاء بوت مخصص باسمك وشعارك',
					'أكثر من 100 ميزة جدار حماية ومكافحة سبام',
					'تقرير إحصائيات يومي في خاص المشرف',
				],
			},
			{
				id: 'pkg_monthly_100',
				name: `اشتراك شهري لمجموعة واحدة (${monthlyPrice} نجمة)`,
				duration_days: 30,
				price_stars: monthlyPrice,
				features: [
					'حماية على مدار الساعة طوال أيام الأسبوع لمجموعة مخصصة',
					'دعم كامل لجميع وحدات الأمان الـ 100+',
					'الاحتفاظ بالبيانات لمدة أسبوع بعد الانتهاء (Safe Hibernation)',
				],
			},
		],
		ru: [
			{
				id: 'pkg_trial_24h',
				name: '24 часа бесплатного теста (все функции)',
				duration_days: 1,
				price_stars: 0,
				features: [
					'Создание персонального бота с вашим именем',
					'100+ функций файрвола и антиспама',
					'Ежедневный отчет в личные сообщения админа',
				],
			},
			{
				id: 'pkg_monthly_100',
				name: `Месячная подписка на 1 группу (${monthlyPrice} Stars)`,
				duration_days: 30,
				price_stars: monthlyPrice,
				features: [
					'Круглосуточная защита 24/7 для 1 выделенной группы',
					'Поддержка всех 100+ модулей безопасности',
					'Сохранение данных в течение 1 недели после истечения (Safe Hibernation)',
				],
			},
		],
		tr: [
			{
				id: 'pkg_trial_24h',
				name: '24 Saat Ücretsiz Deneme (Tüm Özellikler)',
				duration_days: 1,
				price_stars: 0,
				features: [
					'Özel isimli kendi grup botunuzu oluşturun',
					'100+ güvenlik duvarı ve anti-spam özelliği',
					'Yöneticiye günlük analiz raporu',
				],
			},
			{
				id: 'pkg_monthly_100',
				name: `1 Grup Aylık Abonelik (${monthlyPrice} Stars)`,
				duration_days: 30,
				price_stars: monthlyPrice,
				features: [
					'1 özel grup için 7/24 kesintisiz koruma',
					'100+ güvenlik modülünün tümüne erişim',
					'Süre bitiminden sonra 1 hafta veri saklama (Safe Hibernation)',
				],
			},
		],
		es: [
			{
				id: 'pkg_trial_24h',
				name: '24 horas de prueba gratis (Todas las funciones)',
				duration_days: 1,
				price_stars: 0,
				features: [
					'Crea un bot dedicado con tu propio nombre',
					'Más de 100 módulos de firewall y antispam',
					'Informe diario de estadísticas por privado',
				],
			},
			{
				id: 'pkg_monthly_100',
				name: `Suscripción mensual de 1 grupo (${monthlyPrice} Stars)`,
				duration_days: 30,
				price_stars: monthlyPrice,
				features: [
					'Protección ininterrumpida 24/7 para 1 grupo dedicado',
					'Soporte para todos los más de 100 módulos de seguridad',
					'Retención de datos por 1 semana tras vencimiento (Safe Hibernation)',
				],
			},
		],
		pt: [
			{
				id: 'pkg_trial_24h',
				name: '24 horas de teste grátis (Todos os recursos)',
				duration_days: 1,
				price_stars: 0,
				features: [
					'Crie um bot dedicado com seu nome',
					'Mais de 100 módulos de firewall e anti-spam',
					'Relatório diário de estatísticas no privado',
				],
			},
			{
				id: 'pkg_monthly_100',
				name: `Assinatura mensal de 1 grupo (${monthlyPrice} Stars)`,
				duration_days: 30,
				price_stars: monthlyPrice,
				features: [
					'Proteção ininterrupta 24/7 para 1 grupo exclusivo',
					'Suporte a todos os mais de 100 módulos de segurança',
					'Retenção de dados por 1 semana após expirar (Safe Hibernation)',
				],
			},
		],
		de: [
			{
				id: 'pkg_trial_24h',
				name: '24 Stunden kostenlos testen (Alle Funktionen)',
				duration_days: 1,
				price_stars: 0,
				features: [
					'Dedizierten Bot mit eigenem Namen erstellen',
					'100+ Firewall- und Anti-Spam-Module',
					'Täglicher Analysebericht per Admin-DM',
				],
			},
			{
				id: 'pkg_monthly_100',
				name: `Monatsabonnement für 1 Gruppe (${monthlyPrice} Stars)`,
				duration_days: 30,
				price_stars: monthlyPrice,
				features: [
					'Unterbrechungsfreier 24/7-Schutz für 1 dedizierte Gruppe',
					'Unterstützung für alle 100+ Sicherheitsmodule',
					'Datenspeicherung bis zu 1 Woche nach Ablauf (Safe Hibernation)',
				],
			},
		],
		fr: [
			{
				id: 'pkg_trial_24h',
				name: '24 heures d’essai gratuit (Toutes les fonctionnalités)',
				duration_days: 1,
				price_stars: 0,
				features: [
					'Créez votre propre bot avec votre nom',
					'100+ modules pare-feu et anti-spam',
					'Rapport statistique quotidien par message privé',
				],
			},
			{
				id: 'pkg_monthly_100',
				name: `Abonnement mensuel 1 groupe (${monthlyPrice} Stars)`,
				duration_days: 30,
				price_stars: monthlyPrice,
				features: [
					'Protection ininterrompue 24h/24 et 7j/7 pour 1 groupe dédié',
					'Prise en charge des plus de 100 modules de sécurité',
					'Conservation des données 1 semaine après expiration (Safe Hibernation)',
				],
			},
		],
		zh: [
			{
				id: 'pkg_trial_24h',
				name: '24小时免费试用（全部功能）',
				duration_days: 1,
				price_stars: 0,
				features: [
					'创建具有自定义名称的专属机器人',
					'100+ 项防火墙与反垃圾保护模块',
					'在管理员私聊中接收每日分析报告',
				],
			},
			{
				id: 'pkg_monthly_100',
				name: `单群组按月订阅（${monthlyPrice} Stars）`,
				duration_days: 30,
				price_stars: monthlyPrice,
				features: [
					'为 1 个专属群组提供 7x24 小时全天候保护',
					'支持全部 100+ 项安全防护模块',
					'过期后数据保留 1 周（安全休眠模式 Safe Hibernation）',
				],
			},
		],
	};

	return packagesData[lang] || packagesData.en;
}

export function getLocalizedStarsInvoice(lang: BotLang, groupTitle: string, starsAmount: number) {
	const titleClean = (groupTitle || 'Telegram Group').slice(0, 80);
	const dict: Record<
		BotLang,
		{ title: string; description: string; priceLabel: string }
	> = {
		fa: {
			title: 'اشتراک ماهانه مینی‌گارد (۳۰ روز)',
			description: `تمدید ۳۰ روزه حفاظت و مدیریت هوشمند برای گروه «${titleClean}»`,
			priceLabel: 'اشتراک ماهانه ۱ گروه (۳۰ روز)',
		},
		en: {
			title: 'MiniGuard Monthly Subscription (30 Days)',
			description: `30-day renewal of smart protection & management for group "${titleClean}"`,
			priceLabel: '1-Group Monthly Subscription (30 Days)',
		},
		ar: {
			title: 'اشتراك ميني جارد الشهري (30 يوماً)',
			description: `تجديد الحماية والإدارة الذكية لمدة 30 يوماً لمجموعة «${titleClean}»`,
			priceLabel: 'اشتراك شهري لمجموعة واحدة (30 يوماً)',
		},
		ru: {
			title: 'Месячная подписка MiniGuard (30 дней)',
			description: `Продление умной защиты и управления для группы «${titleClean}» на 30 дней`,
			priceLabel: 'Месячная подписка на 1 группу (30 дней)',
		},
		tr: {
			title: 'MiniGuard Aylık Abonelik (30 Gün)',
			description: `"${titleClean}" grubu için 30 günlük akıllı koruma ve yönetim yenilemesi`,
			priceLabel: '1 Grup Aylık Abonelik (30 Gün)',
		},
		es: {
			title: 'Suscripción mensual MiniGuard (30 días)',
			description: `Renovación de 30 días de protección inteligente para el grupo "${titleClean}"`,
			priceLabel: 'Suscripción mensual de 1 grupo (30 días)',
		},
		pt: {
			title: 'Assinatura mensal MiniGuard (30 dias)',
			description: `Renovação de 30 dias de proteção inteligente para o grupo "${titleClean}"`,
			priceLabel: 'Assinatura mensal de 1 grupo (30 dias)',
		},
		de: {
			title: 'MiniGuard Monatsabonnement (30 Tage)',
			description: `30-tägige Verlängerung des intelligenten Schutzes für die Gruppe „${titleClean}“`,
			priceLabel: 'Monatsabonnement für 1 Gruppe (30 Tage)',
		},
		fr: {
			title: 'Abonnement mensuel MiniGuard (30 jours)',
			description: `Renouvellement de 30 jours de la protection intelligente pour le groupe « ${titleClean} »`,
			priceLabel: 'Abonnement mensuel 1 groupe (30 jours)',
		},
		zh: {
			title: 'MiniGuard 按月订阅（30 天）',
			description: `为群组“${titleClean}”续订 30 天智能安全防护与管理`,
			priceLabel: '单群组按月订阅（30 天）',
		},
	};

	return dict[lang] || dict.en;
}

export function getLocalizedCallbackNotice(
	key:
		| 'LINKS_LOCKED'
		| 'LINKS_UNLOCKED'
		| 'EMERGENCY_LOCKED'
		| 'EMERGENCY_UNLOCKED'
		| 'QUIET_HOURS_ENABLED'
		| 'QUIET_HOURS_DISABLED'
		| 'USER_UNMUTED'
		| 'USER_BANNED'
		| 'ACTION_DONE',
	lang: BotLang,
): string {
	const notices: Record<string, Record<BotLang, string>> = {
		LINKS_LOCKED: {
			fa: '🔒 قفل لینک‌ها فعال شد',
			en: '🔒 Link lock enabled',
			ar: '🔒 تم تفعيل قفل الروابط',
			ru: '🔒 Блокировка ссылок включена',
			tr: '🔒 Bağlantı kilidi etkinleştirildi',
			es: '🔒 Bloqueo de enlaces activado',
			pt: '🔒 Bloqueio de links ativado',
			de: '🔒 Link-Sperre aktiviert',
			fr: '🔒 Verrouillage des liens activé',
			zh: '🔒 链接锁定已启用',
		},
		LINKS_UNLOCKED: {
			fa: '🔓 قفل لینک‌ها باز شد',
			en: '🔓 Link lock disabled',
			ar: '🔓 تم إلغاء قفل الروابط',
			ru: '🔓 Блокировка ссылок отключена',
			tr: '🔓 Bağlantı kilidi açıldı',
			es: '🔓 Bloqueo de enlaces desactivado',
			pt: '🔓 Bloqueio de links desativado',
			de: '🔓 Link-Sperre aufgehoben',
			fr: '🔓 Verrouillage des liens désactivé',
			zh: '🔓 链接锁定已解除',
		},
		EMERGENCY_LOCKED: {
			fa: '🚨 قفل اضطراری کل گروه فعال شد',
			en: '🚨 Emergency group lock enabled',
			ar: '🚨 تم تفعيل القفل الطارئ للمجموعة',
			ru: '🚨 Экстренная блокировка группы включена',
			tr: '🚨 Acil grup kilidi etkinleştirildi',
			es: '🚨 Bloqueo de emergencia activado',
			pt: '🚨 Bloqueio de emergência ativado',
			de: '🚨 Notfall-Gruppensperre aktiviert',
			fr: "🚨 Verrouillage d'urgence activé",
			zh: '🚨 全群紧急锁定已启用',
		},
		EMERGENCY_UNLOCKED: {
			fa: '✅ قفل اضطراری برداشته شد',
			en: '✅ Emergency group lock disabled',
			ar: '✅ تم رفع القفل الطارئ',
			ru: '✅ Экстренная блокировка снята',
			tr: '✅ Acil grup kilidi kaldırıldı',
			es: '✅ Bloqueo de emergencia desactivado',
			pt: '✅ Bloqueio de emergência desativado',
			de: '✅ Notfall-Gruppensperre aufgehoben',
			fr: "✅ Verrouillage d'urgence levé",
			zh: '✅ 紧急锁定已解除',
		},
		QUIET_HOURS_ENABLED: {
			fa: '🌙 ساعات سکوت فعال شد',
			en: '🌙 Quiet hours enabled',
			ar: '🌙 تم تفعيل ساعات الهدوء',
			ru: '🌙 Тихие часы включены',
			tr: '🌙 Sessiz saatler etkinleştirildi',
			es: '🌙 Horas de silencio activadas',
			pt: '🌙 Horário de silêncio ativado',
			de: '🌙 Ruhezeit aktiviert',
			fr: '🌙 Heures de silence activées',
			zh: '🌙 静音时间已启用',
		},
		QUIET_HOURS_DISABLED: {
			fa: '☀️ ساعات سکوت غیرفعال شد',
			en: '☀️ Quiet hours disabled',
			ar: '☀️ تم إلغاء ساعات الهدوء',
			ru: '☀️ Тихие часы отключены',
			tr: '☀️ Sessiz saatler kapatıldı',
			es: '☀️ Horas de silencio desactivadas',
			pt: '☀️ Horário de silêncio desativado',
			de: '☀️ Ruhezeit deaktiviert',
			fr: '☀️ Heures de silence désactivées',
			zh: '☀️ 静音时间已停用',
		},
		USER_UNMUTED: {
			fa: '🔊 سکوت کاربر لغو شد',
			en: '🔊 User unmuted',
			ar: '🔊 تم إلغاء كتم المستخدم',
			ru: '🔊 Ограничения с пользователя сняты',
			tr: '🔊 Kullanıcının susturması kaldırıldı',
			es: '🔊 Usuario desilenciado',
			pt: '🔊 Usuário desmutado',
			de: '🔊 Stummschaltung aufgehoben',
			fr: '🔊 Sourdine utilisateur levée',
			zh: '🔊 用户已解除静音',
		},
		USER_BANNED: {
			fa: '🚫 کاربر اخراج شد',
			en: '🚫 User banned',
			ar: '🚫 تم حظر المستخدم',
			ru: '🚫 Пользователь заблокирован',
			tr: '🚫 Kullanıcı yasaklandı',
			es: '🚫 Usuario expulsado',
			pt: '🚫 Usuário banido',
			de: '🚫 Benutzer verbannt',
			fr: '🚫 Utilisateur banni',
			zh: '🚫 用户已被封禁',
		},
		ACTION_DONE: {
			fa: '✅ اقدام انجام شد',
			en: '✅ Action completed',
			ar: '✅ تم الإجراء',
			ru: '✅ Действие выполнено',
			tr: '✅ İşlem tamamlandı',
			es: '✅ Acción completada',
			pt: '✅ Ação concluída',
			de: '✅ Aktion abgeschlossen',
			fr: '✅ Action effectuée',
			zh: '✅ 操作已完成',
		},
	};

	return notices[key]?.[lang] || notices[key]?.en || '';
}
