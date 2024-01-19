package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Datastore is a database model that represents a Porter-provisioned datastore
type Datastore struct {
	gorm.Model

	// ID is a uuid that references the datastore
	ID uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`

	// ProjectID is the ID of the project that the datastore belongs to
	ProjectID uint

	// Name is the name of the datastore
	Name string

	// CloudProvider is the cloud provider that hosts the Kubernetes Cluster. Accepted values: [AWS, GCP, AZURE]
	CloudProvider string `json:"cloud_provider"`

	// CloudProviderCredentialIdentifier is a reference to find the credentials required for access the cluster's API.
	// This was likely the credential that was used to create the cluster.
	// For AWS EKS clusters, this will be an ARN for the final target role in the assume role chain.
	CloudProviderCredentialIdentifier string `json:"cloud_provider_credential_identifier"`

	// Type is the type of datastore. Accepted values: [RDS, ELASTICACHE]
	Type string `json:"type"`

	// Engine is the engine of the datastore. Accepted values: [POSTGRES, AURORA-POSTGRES, REDIS]
	Engine string `json:"engine"`
}