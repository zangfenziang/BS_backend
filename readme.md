# Install

```
npm install
mkdir upload
npm start
```

# Api

## /upload

```
{
    image: file
}
```

## /user/register

```
{
    username: string
    password: string
    email: string
}
```

## /user/login

```
{
    username: string
    password: string
}
```

## /user/find

```
{
    token: string
    uid: string
}
```

## /book/add

```
{
    token: string
    name: string,
    origin: int,
    price: int,
    description: string,
    cover: string,
    link: string
}
```

## /book/list

```
{
    token: string,
    left: int,
    right: int,
    bid: array
}
```

## /book/buy

```
{
    token: string,
    bid: int,
    type: 1 or 2
}
```

## /type/add

```
{
    token: string,
    typename: string
}
```

## /type/list

```
{
    token: string
}
```

## /type/search
```
{
    token: string,
    tid: int
}
```

## /booktype/add

```
{
    token: string,
    tid: int,
    bid: int
}
```

## /message/send

```
{
    token: string,
    to: int,
    message: string
}
```

## /message/list

```
{
    token: string,
    mid: int
}
```
