# Diagrama de Base de Datos

Este diagrama representa la estructura actual definida en `backend/prisma/schema.prisma`.

```mermaid
erDiagram
  User {
    String id PK
    String email UK
    String name
    String lastName
    String password
    Role role
    Boolean isActive
    String tempPassword
    DateTime tempPasswordExp
    DateTime createdAt
    DateTime updatedAt
  }

  Product {
    String id PK
    String name
    String category
    Float price
    Int stock
    String sku
    String size
    String color
    String brand
    Float referencePrice
    String description
    Boolean isActive
    DateTime createdAt
    DateTime updatedAt
  }

  Sale {
    String id PK
    Float total
    String customerName
    String customerDni
    String customerEmail
    String paymentMethod
    String paymentStatus
    String transactionReference
    Float amountPaid
    Float changeAmount
    DateTime createdAt
  }

  SaleItem {
    String id PK
    Int quantity
    Float price
    String productId FK
    String saleId FK
  }

  StockEntry {
    String id PK
    String productId FK
    Int quantity
    Int previousStock
    Int newStock
    String note
    DateTime createdAt
  }

  StockRequest {
    String id PK
    String productId FK
    String requestedBy
    Int quantityRequested
    StockRequestStatus status
    String note
    DateTime createdAt
    DateTime updatedAt
  }

  Product ||--o{ SaleItem : "se vende en"
  Sale ||--o{ SaleItem : "contiene"
  Product ||--o{ StockEntry : "tiene entradas"
  Product ||--o{ StockRequest : "tiene solicitudes"
```

## Relaciones

- `Sale` tiene muchos `SaleItem`.
- `Product` tiene muchos `SaleItem`.
- `SaleItem` funciona como tabla intermedia entre ventas y productos.
- `Product` tiene muchas `StockEntry`, que registran aumentos o movimientos de inventario.
- `Product` tiene muchas `StockRequest`, que registran solicitudes de stock pendientes, aprobadas o rechazadas.
- `User` no tiene relaciones directas declaradas en Prisma actualmente.

## Enums

```prisma
enum Role {
  ADMIN
  USER
}

enum StockRequestStatus {
  PENDING
  APPROVED
  REJECTED
}
```

## Lectura Rapida

La base de datos esta centrada en `Product`. Desde productos se conectan las ventas mediante `SaleItem`, las entradas de inventario mediante `StockEntry` y las solicitudes de inventario mediante `StockRequest`.

El flujo principal queda asi:

```mermaid
flowchart LR
  Product[Producto] --> SaleItem[Detalle de venta]
  Sale[Venta] --> SaleItem
  Product --> StockEntry[Entrada de stock]
  Product --> StockRequest[Solicitud de stock]
  User[Usuario] -. sin relacion directa .- StockRequest
```
