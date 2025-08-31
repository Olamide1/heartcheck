# 🔗 Fix Supabase Deep Linking for Email Confirmation

## 🚨 **URGENT: Your email confirmation is not redirecting back to the app!**

### **Step 1: Update Supabase Site URL**

1. Go to your **Supabase Dashboard**
2. Navigate to **Authentication** → **URL Configuration**
3. **Site URL**: Change from `http://localhost:8081` to:
   ```
   exp://192.168.1.135:8081
   ```
   (Use your actual Expo Go IP address)

### **Step 2: Update Redirect URLs**

In the same **URL Configuration** section, add these **Redirect URLs**:

```
exp://192.168.1.135:8081
exp://192.168.1.135:8081/*
heartcheck://
heartcheck://*
```

### **Step 3: Test Deep Linking**

1. **Sign up** with a new email
2. **Check your email** for confirmation link
3. **Click the link** - it should now redirect to your app
4. **App should open** and show the confirmation screen

### **Step 4: If Still Not Working**

Try these alternative URLs:
```
exp://localhost:8081
exp://localhost:8081/*
exp://127.0.0.1:8081
exp://127.0.0.1:8081/*
```

### **Step 5: Verify in Console**

You should see:
```
LOG  Deep link received: [confirmation_url]
LOG  Email confirmed via deep link!
```

## 🎯 **This Will Fix:**
- ✅ Email confirmation redirecting to app
- ✅ Deep linking working properly
- ✅ User flow completing successfully
