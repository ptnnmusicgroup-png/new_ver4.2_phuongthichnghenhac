# Firebase Public Content Setup

Website dùng Firebase Firestore để lưu công khai:

- `ptnn_updates`: bài đăng trong trang Updates
- `ptnn_music_releases`: Single / EP / Album

## Cần bật trên Firebase Console

1. Mở Firebase project đang dùng trong `firebase-config.js`.
2. Vào Firestore Database.
3. Chọn Create database.
4. Chọn location gần visitor của bạn.
5. Deploy website lên Netlify/GitHub Pages hoặc chạy bằng HTTP server.

## Rules tối thiểu để visitors đọc được

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /ptnn_updates/{docId} {
      allow read: if true;
    }

    match /ptnn_music_releases/{docId} {
      allow read: if true;
    }
  }
}
```

## Lưu ý quyền ghi admin

Tài khoản admin hiện tại là local admin trên trình duyệt. Firebase Security Rules không thể tự nhận biết local admin này. Để đăng/xóa trực tiếp từ website, bạn có 2 hướng:

- Tạm thời mở write cho 2 collection khi bạn đang cập nhật nội dung, sau đó khóa lại.
- Cách tốt hơn: tạo tài khoản Firebase Auth riêng cho admin và cấu hình rules chỉ cho email admin được ghi.

Ví dụ rules theo email admin:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      return request.auth != null && request.auth.token.email == "ptnn.musicgroup@gmail.com";
    }

    match /ptnn_updates/{docId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /ptnn_music_releases/{docId} {
      allow read: if true;
      allow write: if isAdmin();
    }
  }
}
```
