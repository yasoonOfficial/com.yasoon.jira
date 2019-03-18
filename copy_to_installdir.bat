rd /s /q distribution
mkdir distribution
CMD /C node build.js
robocopy distribution %localappdata%\yasoon\apps /S 