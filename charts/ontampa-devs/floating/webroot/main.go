package main

import ( 
    "github.com/gin-gonic/gin"
    "log"
    "net/http"
) 
	
func main() {
    r := gin.Default()

    r.GET("/", func(c *gin.Context) {
          c.File("./static/index.html")
    })
    r.Static("/assets", "./static")

    r.GET("/ping", func(c *gin.Context) {
 	  c.JSON(http.StatusOK, gin.H{
	      "message": "pong",
         })
    })
    log.Println("Server is running on http://localhost:8080")
    if err := r.Run(":8080"); err != nil {
          log.Fatalf("Server failed to start: %v", err)
    }
}
