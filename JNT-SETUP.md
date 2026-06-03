# J&T Checkout Setup

Web hien tai da co:

- Giao dien checkout ngay tren `index.html`
- Endpoint server-side `/.netlify/functions/create-jnt-order`
- Redirect `/api/create-jnt-order` trong `netlify.toml`

## 1. Bien moi truong can co tren Netlify

Tham khao `.env.example`:

- `JNT_ENDPOINT`
- `JNT_USERNAME`
- `JNT_API_KEY`
- `JNT_SIGN_KEY`
- `JNT_SHIPPER_NAME`
- `JNT_SHIPPER_CONTACT`
- `JNT_SHIPPER_PHONE`
- `JNT_SHIPPER_ADDR`
- `JNT_ORIGIN_CODE`

## 2. Nhung gi can xin tu J&T

De tao van don tu dong, J&T thuong chi cap sau khi da ky hop dong:

- API endpoint production
- Username
- API key
- Sign key / secret key
- Mapping ma khu vuc:
  - `destination_code`
  - `receiver_area`

Neu J&T cap bo credential khac cho tai khoan cua ban, can map lai ten bien trong `create-jnt-order.js`.

## 3. Cach web tao don

Frontend gui thong tin checkout sang:

- `/api/create-jnt-order`

Netlify Function se:

1. Nhan cart + thong tin nguoi nhan
2. Tao `data_param`
3. Tao `data_sign` bang MD5 + Base64
4. Goi API J&T
5. Tra ve ma van don `awb_no`

## 4. Luu y khi test

- Neu ban mo web bang `file:///...` thi khong tao don J&T that duoc
- Can deploy len Netlify hoac chay bang mot HTTP server co backend
- Form checkout van dung duoc de:
  - them san pham
  - sua so luong
  - luu nhap tren trinh duyet

## 5. Truong bat buoc tren form checkout

Khi bam `Tao don J&T`, can co:

- Ho ten nguoi nhan
- So dien thoai
- Dia chi
- Ma buu chinh
- `destination_code`
- `receiver_area`

Hai ma cuoi cung la ma mapping noi bo cua J&T, khong phai ten tinh/thanh pho thong thuong.
