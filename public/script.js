// File: public/script.js --- PHIÊN BẢN HOÀN CHỈNH (ĐÃ SỬA LỖI LỌC) ---
// File: script.js

// TÀI KHOẢN MÔ PHỎNG (Giả lập database)
const MOCK_USERS = {
    "admin": { password: "admin", role: "admin" },
    "user": { password: "user", role: "customer" }
};
document.addEventListener("DOMContentLoaded", () => {
    // --- KHAI BÁO BIẾN ---
    const menuContainer = document.getElementById('menuContainer');
    const searchBox = document.getElementById('searchBox');
    const categoryFilter = document.getElementById('categoryFilter');
    const darkToggle = document.querySelector('.dark-toggle');
    const cartContainer = document.getElementById("cartContainer"); // Trang order
    const checkoutContainer = document.getElementById("checkoutContainer"); // Trang order
    const orderTableBody = document.querySelector("#orderTable tbody"); // Trang admin
    const addItemForm = document.getElementById('add-item-form'); // Trang ql thực đơn
    const menuTableBody = document.getElementById('menu-table-body'); // Trang ql thực đơn
    const authButton = document.getElementById('auth-button'); // Nút Đăng nhập/xuất
    const adminLinks = document.getElementById('admin-links'); // Link chỉ admin thấy

    let currentMenuItems = []; // QUAN TRỌNG: Đây là mảng lưu trữ menu từ API

    // File: script.js

    // --- LẤY THÔNG TIN USER TỪ LOCALSTORAGE ---
    const userInfo = localStorage.getItem('userInfo') ? JSON.parse(localStorage.getItem('userInfo')) : null;

    // =============================================
    // CHỨC NĂNG CHUNG: DARK MODE
    // =============================================
    if (darkToggle) {
        function setTheme(isDark) {
            if (isDark) {
                document.body.classList.add("dark");
                darkToggle.textContent = "☀️";
                localStorage.setItem("theme", "dark");
            } else {
                document.body.classList.remove("dark");
                darkToggle.textContent = "🌙";
                localStorage.setItem("theme", "light");
            }
        }
        const savedTheme = localStorage.getItem("theme");
        setTheme(savedTheme === "dark");
        darkToggle.addEventListener('click', () => {
            setTheme(!document.body.classList.contains('dark'));
        });
    }

    // =============================================
    // CHỨC NĂNG CHUNG: NAVBAR AUTHENTICATION
    // =============================================
    function setupNavbar() {
        if (!authButton) return; 

        if (userInfo) {
            authButton.innerHTML = `<i class="bi bi-box-arrow-right"></i> Đăng xuất (${userInfo.username})`;
            authButton.onclick = () => {
                localStorage.removeItem('userInfo'); 
                alert('Bạn đã đăng xuất.');
                window.location.href = '/login.html'; 
            };
            if (userInfo.role === 'admin' && adminLinks) {
                adminLinks.style.display = 'inline'; 
            } else if (adminLinks) {
                adminLinks.style.display = 'none'; 
            }
        } else {
            authButton.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> Đăng nhập';
            authButton.onclick = () => {
                window.location.href = '/login.html'; 
            };
            if (adminLinks) {
                adminLinks.style.display = 'none'; 
            }
        }
    }
    setupNavbar(); 

    // =============================================
    // TRANG CHỦ / MENU (index.html)
    // =============================================
    if (menuContainer && searchBox && categoryFilter) { 
        
        async function fetchMenu() {
            try {
                const response = await fetch('/api/mon-an'); 
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                currentMenuItems = await response.json(); // Lưu dữ liệu API vào đây
                if (!Array.isArray(currentMenuItems)) { 
                   currentMenuItems = []; 
                }
                renderMenu(currentMenuItems); // Hiển thị tất cả ban đầu
            } catch (error) {
                console.error("Lỗi tải menu:", error);
                menuContainer.innerHTML = '<p class="no-results" style="text-align: center; width: 100%;">Lỗi tải thực đơn. Vui lòng thử lại.</p>';
            }
        }

 window.allMenuItems = []; // tạo biến toàn cục
function renderMenu(items) {
    menuContainer.innerHTML = "";
    if (!items || items.length === 0) {
        menuContainer.innerHTML = '<p class="no-results" style="text-align: center; width: 100%;">Không có món ăn nào.</p>';
        return;
    }

    // 👉 Lưu danh sách món ăn vào localStorage để addToClientCart dùng
    localStorage.setItem("menuData", JSON.stringify(items));

    items.forEach(item => {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <img src="${item.image || 'placeholder.jpg'}" alt="${item.name}"> 
            <div class="card-content">
                <h3>${item.name}</h3>
                <p class="category">${item.category}</p>
                <p class="price"><b>${item.price.toLocaleString('vi-VN')} VND</b></p>
                <button class="btn" onclick="addToClientCart('${item._id}')">Thêm vào giỏ</button> 
            </div>`;
        menuContainer.appendChild(card);
    });
}


                    // --- Lọc và tìm kiếm (ĐÃ SỬA LỖI LOGIC LỌC) ---
// --- Lọc và tìm kiếm (PHIÊN BẢN SỬA LỖI CUỐI CÙNG) ---
// --- Lọc và tìm kiếm (ĐÃ SỬA LỖI CHÍNH TẢ) ---
function filterAndSearchMenu() {
    if (!searchBox || !categoryFilter) return; 

    const keyword = searchBox.value.toLowerCase().trim();
    // Chuyển giá trị chọn về chữ thường và bỏ khoảng trắng
    const selectedCategory = categoryFilter.value.toLowerCase().trim(); 

    const filteredItems = currentMenuItems.filter(item => { 
        const nameMatch = item.name.toLowerCase().includes(keyword);
        
        // Chuyển category của món ăn về chữ thường và bỏ khoảng trắng
        const itemCategory = item.category ? item.category.toLowerCase().trim() : '';
        
        // --- SỬA LỖI CHÍNH TẢ Ở ĐÂY ---
        // So sánh hai giá trị đã được làm sạch
        const categoryMatch = (selectedCategory === "all" || itemCategory === selectedCategory); 
        // -----------------------------

        return nameMatch && categoryMatch;
    });

    renderMenu(filteredItems); // Hiển thị kết quả đã lọc
}
        // Gắn sự kiện
        searchBox.addEventListener("input", filterAndSearchMenu);
        categoryFilter.addEventListener("change", filterAndSearchMenu);

        // Tải menu lần đầu
        fetchMenu();
    }

    // =============================================
    // GIỎ HÀNG (Lưu trên Client bằng localStorage)
    // =============================================
   // THAY THẾ HÀM CŨ BẰNG HÀM MỚI NÀY


    // =============================================
    // TRANG ĐẶT MÓN (order.html)
    // =============================================
    if (cartContainer && checkoutContainer) {
        function renderOrderPageCart() {
            const cart = JSON.parse(localStorage.getItem("clientCart")) || [];
            cartContainer.innerHTML = "<h2>🛒 Giỏ hàng của bạn</h2>";
            
            if (cart.length === 0) {
                cartContainer.innerHTML += "<p>Chưa có món nào trong giỏ hàng.</p>";
                checkoutContainer.innerHTML = ""; 
                return;
            }

            let total = 0;
            cart.forEach((item, index) => {
                const itemTotal = item.price * (item.qty || 1);
                total += itemTotal;

                const cartItemDiv = document.createElement("div");
                cartItemDiv.className = "cart-item";
                cartItemDiv.innerHTML = `
                     <img src="${item.img || 'placeholder.jpg'}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; margin-right: 15px;">
                    <div class="cart-item-info">
                        <h4>${item.name}</h4>
                        <p>${(item.qty || 1)} x ${item.price.toLocaleString('vi-VN')} VND</p>
                    </div>
                    <div class="cart-item-actions">
                        <span class="item-total-price">${itemTotal.toLocaleString('vi-VN')} VND</span>
                        <button class="btn-remove" onclick="removeItemFromClientCart(${index})"><i class="bi bi-trash3"></i> Xóa</button>
                    </div>
                `;
                cartContainer.appendChild(cartItemDiv);
            });

            checkoutContainer.innerHTML = `
                <div class="checkout-summary">
                    <h3><span>Tổng cộng:</span> <span>${total.toLocaleString('vi-VN')} VND</span></h3>
                    <input type="text" id="customerName" placeholder="Nhập tên của bạn hoặc số bàn" required>
                    <button class="btn" onclick="submitClientOrder()">Gửi Đơn Hàng</button>
                    <div id="orderError" style="color: #e74c3c; margin-top: 10px; display: none;"></div>
                </div>`;
        }
        renderOrderPageCart();
    }
    
    // =============================================
    // TRANG QUẢN LÝ ĐƠN HÀNG (admin.html)
    // =============================================
     if (orderTableBody) { 
         if (!userInfo || userInfo.role !== 'admin') {
             document.body.innerHTML = '<h1>Bạn không có quyền truy cập trang này.</h1><p><a href="/login.html">Đăng nhập với tài khoản Admin</a></p>';
             return; // Dừng thực thi script
         }
        
        async function fetchAdminOrders() {
            try {
                const response = await fetch('/api/don-hang', {
                    headers: { 'Authorization': `Bearer ${userInfo.token}` }
                });
                if (!response.ok) {
                    if (response.status === 401 || response.status === 403) {
                         alert('Phiên đăng nhập hết hạn hoặc không có quyền.');
                         localStorage.removeItem('userInfo');
                         window.location.href = '/login.html';
                    }
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const orders = await response.json();
                renderAdminOrders(orders);
            } catch (error) {
                console.error("Lỗi tải đơn hàng admin:", error);
                orderTableBody.innerHTML = `<tr><td colspan="5">Lỗi tải đơn hàng: ${error.message}</td></tr>`;
            }
        }

        function renderAdminOrders(orders) {
            orderTableBody.innerHTML = "";
            if (!orders || orders.length === 0) {
                orderTableBody.innerHTML = "<tr><td colspan='5'>Chưa có đơn hàng nào.</td></tr>";
                return;
            }

            orders.forEach((order) => {
                 const itemsHtml = order.items && Array.isArray(order.items)
                    ? order.items.map(item =>
                        `<li>${item.itemId ? item.itemId.name : `ID:${item.itemId}`} (x${item.quantity})</li>`
                      ).join('')
                    : '<li>Lỗi dữ liệu món ăn</li>';

                const tr = document.createElement("tr");
                tr.className = `status-${order.status.replace(/\s+/g, '-').toLowerCase()}`;
                tr.innerHTML = `
                    <td>${order.customerName}</td>
                    <td><ul>${itemsHtml}</ul></td>
                    <td>${order.totalPrice ? order.totalPrice.toLocaleString('vi-VN') : 'N/A'} VND</td>
                    <td>${order.status}</td>
                    <td>
                        <button class="btn-action btn-approve" ${order.status === 'Đang xử lý' ? 'disabled' : ''} onclick="updateOrderStatusAdmin('${order._id}', 'Đang xử lý')">⏳ Xử lý</button>
                        <button class="btn-action btn-complete" ${order.status === 'Hoàn thành' ? 'disabled' : ''} onclick="updateOrderStatusAdmin('${order._id}', 'Hoàn thành')">✅ Hoàn thành</button>
                        <button class="btn-action btn-cancel" ${order.status === 'Đã hủy' ? 'disabled' : ''} onclick="updateOrderStatusAdmin('${order._id}', 'Đã hủy')">❌ Hủy</button>
                    </td>`;
                orderTableBody.appendChild(tr);
            });
        }

        fetchAdminOrders(); // Tải lần đầu

        // Lắng nghe sự kiện real-time từ server
        try {
            const socket = io(); 
            socket.on('connect', () => console.log('Admin connected to Socket.IO'));
            socket.on('new_order', (newOrder) => {
                console.log('Admin nhận đơn mới:', newOrder);
                fetchAdminOrders(); 
            });
            socket.on('order_updated', (updatedOrder) => {
                console.log('Admin nhận đơn cập nhật:', updatedOrder);
                fetchAdminOrders(); 
            });
        } catch (e) {
            console.warn("Không thể kết nối Socket.IO. Cập nhật real-time sẽ không hoạt động.", e.message);
        }

    } 

    // =============================================
    // TRANG QUẢN LÝ THỰC ĐƠN (quan-ly-thuc-don.html)
    // =============================================
    if (addItemForm) { 
        if (!userInfo || userInfo.role !== 'admin') {
             document.body.innerHTML = '<h1>Bạn không có quyền truy cập trang này.</h1><p><a href="/login.html">Đăng nhập với tài khoản Admin</a></p>';
             return; 
        }
        
        async function fetchAdminMenu() {
            try {
                 const response = await fetch('/api/mon-an'); 
                 if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                 const menu = await response.json();
                 renderAdminMenu(menu);
            } catch (error) {
                 console.error("Lỗi tải menu admin:", error);
                 if (menuTableBody) menuTableBody.innerHTML = `<tr><td colspan="4">Lỗi tải thực đơn: ${error.message}</td></tr>`;
            }
        }

        function renderAdminMenu(menu) {
             if (!menuTableBody) return;
             menuTableBody.innerHTML = '';
             if (!menu || menu.length === 0) {
                 menuTableBody.innerHTML = '<tr><td colspan="4">Chưa có món ăn nào.</td></tr>';
                 return;
             }
             menu.forEach(item => {
                 const row = document.createElement('tr');
                 row.innerHTML = `
                    <td><img src="${item.image}" alt="${item.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 5px;"></td>
                    <td>${item.name}</td>
                    <td>${item.price.toLocaleString('vi-VN')} VND</td>
                    <td>${item.category}</td>
                    <td>
                        <button class="btn-action btn-edit" onclick="editMenuItem('${item._id}', '${item.name}', ${item.price}, '${item.image}', '${item.category}')">Sửa</button> 
                        <button class="btn-action btn-delete" onclick="deleteMenuItem('${item._id}')">Xóa</button>
                    </td>
                `;
                 menuTableBody.appendChild(row);
             });
        }

        addItemForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newItem = {
                name: document.getElementById('name').value.trim(),
                price: parseInt(document.getElementById('price').value),
                image: document.getElementById('image').value.trim(),
                category: document.getElementById('category').value.trim(),
            };

            if (!newItem.name || !newItem.price || !newItem.image || !newItem.category) { return alert('Vui lòng điền đủ thông tin.'); }
            if (isNaN(newItem.price) || newItem.price < 0) { return alert('Giá tiền không hợp lệ.'); }

            const editingItemId = addItemForm.dataset.editingId;
            const apiUrl = editingItemId ? `/api/mon-an/${editingItemId}` : '/api/mon-an';
            const apiMethod = editingItemId ? 'PATCH' : 'POST';

            try {
                const response = await fetch(apiUrl, {
                    method: apiMethod,
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${userInfo.token}`
                    },
                    body: JSON.stringify(newItem)
                });
                 if (!response.ok) {
                     const errData = await response.json();
                     throw new Error(errData.message || (editingItemId ? 'Sửa' : 'Thêm') + ' món thất bại');
                 }
                addItemForm.reset();
                delete addItemForm.dataset.editingId; 
                document.querySelector('#add-item-form button[type="submit"]').textContent = 'Thêm Món'; 
                fetchAdminMenu();
                alert((editingItemId ? 'Sửa' : 'Thêm') + ' món ăn thành công!');
            } catch(error) {
                 console.error("Lỗi lưu món:", error);
                 alert(`Lỗi ${editingItemId ? 'sửa' : 'thêm'} món ăn: ${error.message}`);
            }
        });

        fetchAdminMenu(); // Tải lần đầu
    }
   

}); // Kết thúc DOMContentLoaded

// ==========================================================
// CÁC HÀM TOÀN CỤC (để onclick có thể gọi)
// ==========================================================
window.removeItemFromClientCart = function(index) {
    let cart = JSON.parse(localStorage.getItem("clientCart")) || [];
    cart.splice(index, 1);
    localStorage.setItem("clientCart", JSON.stringify(cart));
    // Tải lại trang order để cập nhật giỏ hàng và tổng tiền
    if (document.getElementById("cartContainer")) {
        location.reload(); // Cách đơn giản nhất
    }
}

window.submitClientOrder = async function() {
    const customerNameInput = document.getElementById("customerName");
    const orderError = document.getElementById("orderError");
    if (!customerNameInput || !orderError) return;

    const customerName = customerNameInput.value.trim();
    if (!customerName) {
        alert("Vui lòng nhập tên hoặc số bàn!");
        customerNameInput.focus();
        return;
    }

    const cart = JSON.parse(localStorage.getItem("clientCart")) || [];
    if (cart.length === 0) {
        alert("Giỏ hàng của bạn đang trống!");
        return;
    }

    const orderItems = cart.map(item => ({ itemId: item._id, quantity: item.qty }));
    orderError.style.display = 'none';

    try {
        const response = await fetch('/api/don-hang', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customerName, items: orderItems })
        });
        const data = await response.json();

        if (response.status === 201) {
            localStorage.removeItem("clientCart"); 
            alert("Đặt hàng thành công! Cảm ơn bạn.");
            window.location.href = "/"; 
        } else {
             orderError.textContent = data.message || 'Gửi đơn hàng thất bại.';
             orderError.style.display = 'block';
        }
    } catch(error) {
        console.error("Lỗi gửi đơn hàng:", error);
        orderError.textContent = 'Lỗi kết nối server. Vui lòng thử lại.';
        orderError.style.display = 'block';
    }
}

window.updateOrderStatusAdmin = async function(orderId, newStatus) {
     const userInfo = localStorage.getItem('userInfo') ? JSON.parse(localStorage.getItem('userInfo')) : null;
     if (!userInfo || !userInfo.token) return alert('Vui lòng đăng nhập lại.');
     try {
         const response = await fetch(`/api/don-hang/${orderId}`, {
             method: 'PATCH',
             headers: { 
                 'Content-Type': 'application/json',
                 'Authorization': `Bearer ${userInfo.token}` 
             },
             body: JSON.stringify({ status: newStatus })
         });
         if (!response.ok) {
             const errData = await response.json();
             throw new Error(errData.message || 'Cập nhật thất bại');
         }
         // Socket.IO sẽ tự động cập nhật, nếu không có, cần fetch lại
         if (typeof io === 'undefined' && document.querySelector("#orderTable tbody")) {
             // Phải gọi hàm fetchAdminOrders, nhưng nó nằm trong scope DOMContentLoaded
             // Tạm thời reload
             location.reload();
         }
     } catch(error) {
         console.error("Lỗi cập nhật status:", error);
         alert(`Lỗi cập nhật trạng thái: ${error.message}`);
     }
}

window.deleteMenuItem = async function(id) {
     const userInfo = localStorage.getItem('userInfo') ? JSON.parse(localStorage.getItem('userInfo')) : null;
     if (!userInfo || !userInfo.token) return alert('Vui lòng đăng nhập lại.');
     if (confirm('Bạn có chắc chắn muốn xóa món ăn này không?')) {
        try {
             const response = await fetch(`/api/mon-an/${id}`, { 
                 method: 'DELETE',
                 headers: { 'Authorization': `Bearer ${userInfo.token}` } 
             });
             if (!response.ok) {
                 const errData = await response.json();
                 throw new Error(errData.message || 'Xóa thất bại');
             }
             alert('Xóa món ăn thành công!');
             if (document.getElementById('add-item-form')) {
                 location.reload(); // Tạm thời reload
             }
         } catch(error) {
             console.error("Lỗi xóa món:", error);
             alert(`Lỗi xóa món ăn: ${error.message}`);
         }
     }
}

window.editMenuItem = function(id, name, price, image, category) {
     const addItemForm = document.getElementById('add-item-form');
     if (!addItemForm) return;
     
     document.getElementById('name').value = name;
     document.getElementById('price').value = price;
     document.getElementById('image').value = image;
     document.getElementById('category').value = category;
     
     addItemForm.dataset.editingId = id;
     document.querySelector('#add-item-form button[type="submit"]').textContent = 'Lưu Thay Đổi';
     
     addItemForm.scrollIntoView({ behavior: 'smooth' });
}
// --- Xử lý mở / đóng modal đăng nhập ---
const authButton = document.getElementById('authButton');
const loginModal = document.getElementById('loginModal');
const modalClose = document.getElementById('modalClose');

if (authButton && loginModal && modalClose) {
    // Khi nhấn nút "Đăng nhập"
    authButton.addEventListener('click', () => {
        loginModal.style.display = 'flex';
    });

    // Khi nhấn nút đóng (x)
    modalClose.addEventListener('click', () => {
        loginModal.style.display = 'none';
    });

    // Khi click ra ngoài modal
    window.addEventListener('click', (e) => {
        if (e.target === loginModal) {
            loginModal.style.display = 'none';
        }
    });
            
}
document.addEventListener("DOMContentLoaded", () => {
  const loginModal = document.getElementById("loginModal");
  const authButton = document.getElementById("authButton");
// =============================================
    // CHỨC NĂNG CHUNG: XÁC THỰC & NAVBAR
    // =============================================
    function checkLoginStatus() {
        // Lấy thông tin user từ localStorage
        const userInfo = JSON.parse(localStorage.getItem("userInfo")); 

        if (userInfo) {
            // === ĐÃ ĐĂNG NHẬP ===
            // 1. Đổi chữ nút thành "Đăng xuất"
            if(authButton) authButton.textContent = `Đăng xuất (${userInfo.username})`;
            
            // 2. Hiện các link (Đặt món, Quản lý)
            if (navOrderLink) navOrderLink.style.display = 'inline-block';
            if (userInfo.role === 'admin') {
                if (navAdminLink) navAdminLink.style.display = 'inline-block';
                if (navMenuAdminLink) navMenuAdminLink.style.display = 'inline-block';
            } else {
                if (navAdminLink) navAdminLink.style.display = 'none';
                if (navMenuAdminLink) navMenuAdminLink.style.display = 'none';
            }
        } else {
            // === CHƯA ĐĂNG NHẬP ===
            // 1. Nút hiển thị là "Đăng nhập"
            if(authButton) authButton.textContent = 'Đăng nhập';
            
            // 2. Ẩn các link
            if (navOrderLink) navOrderLink.style.display = 'none';
            if (navAdminLink) navAdminLink.style.display = 'none';
            if (navMenuAdminLink) navMenuAdminLink.style.display = 'none';
        }
    }
  // Gắn sự kiện cho nút Đăng nhập / Đăng xuất chính
    if (authButton) {
        authButton.addEventListener('click', () => {
            // Lấy trạng thái đăng nhập MỚI NHẤT
            const userInfo = JSON.parse(localStorage.getItem("userInfo"));
            if (userInfo) {
                // TRƯỜNG HỢP 1: NÚT ĐANG HIỂN THỊ "ĐĂNG XUẤT"
                // -> Thực hiện logic ĐĂNG XUẤT
                if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
                    localStorage.removeItem('userInfo'); // Xóa "vé"
                    checkLoginStatus(); // Cập nhật lại Navbar (đổi thành nút "Đăng nhập")
                    alert('Đã đăng xuất.');
                    location.reload(); // Tải lại trang
                }
            } else {
                // TRƯỜNG HỢP 2: NÚT ĐANG HIỂN THỊ "ĐĂNG NHẬP"
                // -> Thực hiện logic ĐĂNG NHẬP (Mở Modal)
                if (loginModal) {
                    loginModal.style.display = 'block';
                }
            }
        });
    }

  // Đóng modal khi bấm ra ngoài
  window.addEventListener("click", (event) => {
    if (event.target === loginModal) {
      loginModal.style.display = "none";
    }
  });
});

function closeModal() {
  document.getElementById("loginModal").style.display = "none";
}
function addToClientCart(id) {
    const userInfo = JSON.parse(localStorage.getItem("userInfo"));
    if (!userInfo || userInfo.role !== "user") {
        showToast("⚠️ Vui lòng đăng nhập tài khoản khách hàng trước khi đặt món!");
        return;
    }

    const menu = JSON.parse(localStorage.getItem("menuData")) || [];
    const item = menu.find(m => m._id === id);
    if (!item) {
        showToast("❌ Món ăn không tồn tại!");
        return;
    }

    let cart = JSON.parse(localStorage.getItem("clientCart")) || [];
    const existing = cart.find(i => i._id === id);

    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ ...item, quantity: 1 });
    }

    localStorage.setItem("clientCart", JSON.stringify(cart));
    showToast(`✅ Đã thêm "${item.name}" vào giỏ hàng!`);
}

function showToast(message) {
  const toast = document.getElementById("toastMessage");
  if (!toast) return; // tránh lỗi nếu HTML chưa có toast

  toast.textContent = message;
  toast.classList.add("show");

  // Tự ẩn sau 2 giây
  setTimeout(() => {
    toast.classList.remove("show");
  }, 2000);
}






