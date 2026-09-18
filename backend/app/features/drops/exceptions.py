from fastapi import HTTPException, status


class DropNotFound(HTTPException):
    def __init__(self) -> None:
        super().__init__(status.HTTP_404_NOT_FOUND, "Папка не найдена или срок её хранения истёк")


class FileNotFound(HTTPException):
    def __init__(self) -> None:
        super().__init__(status.HTTP_404_NOT_FOUND, "Файл не найден")


class InvalidOwnerToken(HTTPException):
    def __init__(self) -> None:
        super().__init__(status.HTTP_403_FORBIDDEN, "Нет прав на управление этой папкой")


class AccessDenied(HTTPException):
    def __init__(self) -> None:
        super().__init__(status.HTTP_401_UNAUTHORIZED, "Папка защищена паролем")


class WrongPassword(HTTPException):
    def __init__(self) -> None:
        super().__init__(status.HTTP_401_UNAUTHORIZED, "Неверный пароль")


class NameTaken(HTTPException):
    def __init__(self) -> None:
        super().__init__(status.HTTP_409_CONFLICT, "Это имя папки уже занято")


class InvalidOperation(HTTPException):
    def __init__(self, detail: str) -> None:
        super().__init__(status.HTTP_400_BAD_REQUEST, detail)


class StorageFull(HTTPException):
    def __init__(self) -> None:
        super().__init__(
            status.HTTP_507_INSUFFICIENT_STORAGE,
            "Хранилище сервера временно заполнено, попробуйте позже",
        )
