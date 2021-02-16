package keyrotate

import (
	"fmt"

	"github.com/porter-dev/porter/internal/models"
	ints "github.com/porter-dev/porter/internal/models/integrations"
	gorm "github.com/porter-dev/porter/internal/repository/gorm"

	_gorm "gorm.io/gorm"
)

// process 100 records at a time
const stepSize = 100

func Rotate(db *_gorm.DB, oldKey, newKey *[32]byte) error {
	oldKeyBytes := make([]byte, 32)
	newKeyBytes := make([]byte, 32)

	copy(oldKeyBytes[:], oldKey[:])
	copy(newKeyBytes[:], newKey[:])

	fmt.Printf("beginning key rotation from %s to %s\n", string(oldKeyBytes), string(newKeyBytes))

	for i, b := range oldKeyBytes {
		fmt.Println(i, ":", string(b), string(newKeyBytes[i]))
	}

	err := rotateClusterModel(db, oldKey, newKey)

	if err != nil {
		fmt.Printf("failed on cluster rotation: %v\n", err)
		return err
	}

	err = rotateClusterCandidateModel(db, oldKey, newKey)

	if err != nil {
		fmt.Printf("failed on cc rotation: %v\n", err)

		return err
	}

	err = rotateRegistryModel(db, oldKey, newKey)

	if err != nil {
		fmt.Printf("failed on registry rotation: %v\n", err)

		return err
	}

	err = rotateHelmRepoModel(db, oldKey, newKey)

	if err != nil {
		fmt.Printf("failed on hr rotation: %v\n", err)

		return err
	}

	err = rotateInfraModel(db, oldKey, newKey)

	if err != nil {
		fmt.Printf("failed on infra rotation: %v\n", err)

		return err
	}

	err = rotateKubeIntegrationModel(db, oldKey, newKey)

	if err != nil {
		fmt.Printf("failed on ki rotation: %v\n", err)

		return err
	}

	err = rotateBasicIntegrationModel(db, oldKey, newKey)

	if err != nil {
		fmt.Printf("failed on basic rotation: %v\n", err)

		return err
	}

	err = rotateOIDCIntegrationModel(db, oldKey, newKey)

	if err != nil {
		fmt.Printf("failed on oidc rotation: %v\n", err)

		return err
	}

	err = rotateOAuthIntegrationModel(db, oldKey, newKey)

	if err != nil {
		fmt.Printf("failed on oauth rotation: %v\n", err)

		return err
	}

	err = rotateGCPIntegrationModel(db, oldKey, newKey)

	if err != nil {
		fmt.Printf("failed on gcp rotation: %v\n", err)

		return err
	}

	err = rotateAWSIntegrationModel(db, oldKey, newKey)

	if err != nil {
		fmt.Printf("failed on aws rotation: %v\n", err)

		return err
	}

	return nil
}

func rotateClusterModel(db *_gorm.DB, oldKey, newKey *[32]byte) error {
	// get count of model
	var count int64

	if err := db.Model(&models.Cluster{}).Count(&count).Error; err != nil {
		return err
	}

	// cluster-scoped repository
	repo := gorm.NewClusterRepository(db, oldKey).(*gorm.ClusterRepository)

	fmt.Printf("rotating %d clusters\n", count)

	// iterate (count / stepSize) + 1 times using Limit and Offset
	for i := 0; i < (int(count)/stepSize)+1; i++ {
		clusters := []*models.Cluster{}

		if err := db.Offset(i * stepSize).Limit(stepSize).Preload("TokenCache").Find(&clusters).Error; err != nil {
			return err
		}

		// decrypt with the old key
		for i, cluster := range clusters {
			fmt.Printf("decrypting %d: %s\n", i, cluster.Name)

			err := repo.DecryptClusterData(cluster, oldKey)

			if err != nil {
				return err
			}

			fmt.Printf("decrypted %d: %s\n", i, cluster.Name)
		}

		// encrypt with the new key and re-insert
		for _, cluster := range clusters {
			fmt.Printf("encrypting %d: %s\n", i, cluster.Name)

			err := repo.EncryptClusterData(cluster, newKey)

			if err != nil {
				return err
			}

			fmt.Printf("encrypted %d: %s\n", i, cluster.Name)

			if err := db.Save(cluster).Error; err != nil {
				return err
			}
		}
	}

	fmt.Printf("rotated %d clusters\n", count)

	return nil
}

func rotateClusterCandidateModel(db *_gorm.DB, oldKey, newKey *[32]byte) error {
	// get count of model
	var count int64

	if err := db.Model(&models.ClusterCandidate{}).Count(&count).Error; err != nil {
		return err
	}

	// cluster-scoped repository
	repo := gorm.NewClusterRepository(db, oldKey).(*gorm.ClusterRepository)

	// iterate (count / stepSize) + 1 times using Limit and Offset
	for i := 0; i < (int(count)/stepSize)+1; i++ {
		ccs := []*models.ClusterCandidate{}

		if err := db.Offset(i * stepSize).Limit(stepSize).Find(&ccs).Error; err != nil {
			return err
		}

		// decrypt with the old key
		for _, cc := range ccs {
			err := repo.DecryptClusterCandidateData(cc, oldKey)

			if err != nil {
				return err
			}
		}

		// encrypt with the new key and re-insert
		for _, cc := range ccs {
			err := repo.EncryptClusterCandidateData(cc, newKey)

			if err != nil {
				return err
			}

			if err := db.Save(cc).Error; err != nil {
				return err
			}
		}
	}

	fmt.Printf("rotated %d cluster candidates", count)

	return nil
}

func rotateRegistryModel(db *_gorm.DB, oldKey, newKey *[32]byte) error {
	// get count of model
	var count int64

	if err := db.Model(&models.Registry{}).Count(&count).Error; err != nil {
		return err
	}

	// registry-scoped repository
	repo := gorm.NewRegistryRepository(db, oldKey).(*gorm.RegistryRepository)

	// iterate (count / stepSize) + 1 times using Limit and Offset
	for i := 0; i < (int(count)/stepSize)+1; i++ {
		regs := []*models.Registry{}

		if err := db.Offset(i * stepSize).Limit(stepSize).Preload("TokenCache").Find(&regs).Error; err != nil {
			return err
		}

		// decrypt with the old key
		for _, reg := range regs {
			err := repo.DecryptRegistryData(reg, oldKey)

			if err != nil {
				return err
			}
		}

		// encrypt with the new key and re-insert
		for _, reg := range regs {
			err := repo.EncryptRegistryData(reg, newKey)

			if err != nil {
				return err
			}

			if err := db.Save(reg).Error; err != nil {
				return err
			}
		}
	}

	fmt.Printf("rotated %d registries", count)

	return nil
}

func rotateHelmRepoModel(db *_gorm.DB, oldKey, newKey *[32]byte) error {
	// get count of model
	var count int64

	if err := db.Model(&models.HelmRepo{}).Count(&count).Error; err != nil {
		return err
	}

	// helm repo-scoped repository
	repo := gorm.NewHelmRepoRepository(db, oldKey).(*gorm.HelmRepoRepository)

	// iterate (count / stepSize) + 1 times using Limit and Offset
	for i := 0; i < (int(count)/stepSize)+1; i++ {
		hrs := []*models.HelmRepo{}

		if err := db.Offset(i * stepSize).Limit(stepSize).Preload("TokenCache").Find(&hrs).Error; err != nil {
			return err
		}

		// decrypt with the old key
		for _, hr := range hrs {
			err := repo.DecryptHelmRepoData(hr, oldKey)

			if err != nil {
				return err
			}
		}

		// encrypt with the new key and re-insert
		for _, hr := range hrs {
			err := repo.EncryptHelmRepoData(hr, newKey)

			if err != nil {
				return err
			}

			if err := db.Save(hr).Error; err != nil {
				return err
			}
		}
	}

	fmt.Printf("rotated %d helm repos", count)

	return nil
}

func rotateInfraModel(db *_gorm.DB, oldKey, newKey *[32]byte) error {
	// get count of model
	var count int64

	if err := db.Model(&models.Infra{}).Count(&count).Error; err != nil {
		return err
	}

	// helm repo-scoped repository
	repo := gorm.NewInfraRepository(db, oldKey).(*gorm.InfraRepository)

	// iterate (count / stepSize) + 1 times using Limit and Offset
	for i := 0; i < (int(count)/stepSize)+1; i++ {
		infras := []*models.Infra{}

		if err := db.Offset(i * stepSize).Limit(stepSize).Find(&infras).Error; err != nil {
			return err
		}

		// decrypt with the old key
		for _, infra := range infras {
			err := repo.DecryptInfraData(infra, oldKey)

			if err != nil {
				return err
			}
		}

		// encrypt with the new key and re-insert
		for _, infra := range infras {
			err := repo.EncryptInfraData(infra, newKey)

			if err != nil {
				return err
			}

			if err := db.Save(infra).Error; err != nil {
				return err
			}
		}
	}

	fmt.Printf("rotated %d infras", count)

	return nil
}

func rotateKubeIntegrationModel(db *_gorm.DB, oldKey, newKey *[32]byte) error {
	// get count of model
	var count int64

	if err := db.Model(&ints.KubeIntegration{}).Count(&count).Error; err != nil {
		return err
	}

	// cluster-scoped repository
	repo := gorm.NewKubeIntegrationRepository(db, oldKey).(*gorm.KubeIntegrationRepository)

	// iterate (count / stepSize) + 1 times using Limit and Offset
	for i := 0; i < (int(count)/stepSize)+1; i++ {
		kis := []*ints.KubeIntegration{}

		if err := db.Offset(i * stepSize).Limit(stepSize).Find(&kis).Error; err != nil {
			return err
		}

		// decrypt with the old key
		for _, ki := range kis {
			err := repo.DecryptKubeIntegrationData(ki, oldKey)

			if err != nil {
				return err
			}
		}

		// encrypt with the new key and re-insert
		for _, ki := range kis {
			err := repo.EncryptKubeIntegrationData(ki, newKey)

			if err != nil {
				return err
			}

			if err := db.Save(ki).Error; err != nil {
				return err
			}
		}
	}

	fmt.Printf("rotated %d kube integrations", count)

	return nil
}

func rotateBasicIntegrationModel(db *_gorm.DB, oldKey, newKey *[32]byte) error {
	// get count of model
	var count int64

	if err := db.Model(&ints.BasicIntegration{}).Count(&count).Error; err != nil {
		return err
	}

	// cluster-scoped repository
	repo := gorm.NewBasicIntegrationRepository(db, oldKey).(*gorm.BasicIntegrationRepository)

	// iterate (count / stepSize) + 1 times using Limit and Offset
	for i := 0; i < (int(count)/stepSize)+1; i++ {
		basics := []*ints.BasicIntegration{}

		if err := db.Offset(i * stepSize).Limit(stepSize).Find(&basics).Error; err != nil {
			return err
		}

		// decrypt with the old key
		for _, basic := range basics {
			err := repo.DecryptBasicIntegrationData(basic, oldKey)

			if err != nil {
				return err
			}
		}

		// encrypt with the new key and re-insert
		for _, basic := range basics {
			err := repo.EncryptBasicIntegrationData(basic, newKey)

			if err != nil {
				return err
			}

			if err := db.Save(basic).Error; err != nil {
				return err
			}
		}
	}

	fmt.Printf("rotated %d basic integrations", count)

	return nil
}

func rotateOIDCIntegrationModel(db *_gorm.DB, oldKey, newKey *[32]byte) error {
	// get count of model
	var count int64

	if err := db.Model(&ints.OIDCIntegration{}).Count(&count).Error; err != nil {
		return err
	}

	// cluster-scoped repository
	repo := gorm.NewOIDCIntegrationRepository(db, oldKey).(*gorm.OIDCIntegrationRepository)

	// iterate (count / stepSize) + 1 times using Limit and Offset
	for i := 0; i < (int(count)/stepSize)+1; i++ {
		oidcs := []*ints.OIDCIntegration{}

		if err := db.Offset(i * stepSize).Limit(stepSize).Find(&oidcs).Error; err != nil {
			return err
		}

		// decrypt with the old key
		for _, oidc := range oidcs {
			err := repo.DecryptOIDCIntegrationData(oidc, oldKey)

			if err != nil {
				return err
			}
		}

		// encrypt with the new key and re-insert
		for _, oidc := range oidcs {
			err := repo.EncryptOIDCIntegrationData(oidc, newKey)

			if err != nil {
				return err
			}

			if err := db.Save(oidc).Error; err != nil {
				return err
			}
		}
	}

	fmt.Printf("rotated %d oidc integrations", count)

	return nil
}

func rotateOAuthIntegrationModel(db *_gorm.DB, oldKey, newKey *[32]byte) error {
	// get count of model
	var count int64

	if err := db.Model(&ints.OAuthIntegration{}).Count(&count).Error; err != nil {
		return err
	}

	// cluster-scoped repository
	repo := gorm.NewOAuthIntegrationRepository(db, oldKey).(*gorm.OAuthIntegrationRepository)

	// iterate (count / stepSize) + 1 times using Limit and Offset
	for i := 0; i < (int(count)/stepSize)+1; i++ {
		oauths := []*ints.OAuthIntegration{}

		if err := db.Offset(i * stepSize).Limit(stepSize).Find(&oauths).Error; err != nil {
			return err
		}

		// decrypt with the old key
		for _, oauth := range oauths {
			err := repo.DecryptOAuthIntegrationData(oauth, oldKey)

			if err != nil {
				return err
			}
		}

		// encrypt with the new key and re-insert
		for _, oauth := range oauths {
			err := repo.EncryptOAuthIntegrationData(oauth, newKey)

			if err != nil {
				return err
			}

			if err := db.Save(oauth).Error; err != nil {
				return err
			}
		}
	}

	fmt.Printf("rotated %d oauth integrations", count)

	return nil
}

func rotateGCPIntegrationModel(db *_gorm.DB, oldKey, newKey *[32]byte) error {
	// get count of model
	var count int64

	if err := db.Model(&ints.GCPIntegration{}).Count(&count).Error; err != nil {
		return err
	}

	// cluster-scoped repository
	repo := gorm.NewGCPIntegrationRepository(db, oldKey).(*gorm.GCPIntegrationRepository)

	// iterate (count / stepSize) + 1 times using Limit and Offset
	for i := 0; i < (int(count)/stepSize)+1; i++ {
		gcps := []*ints.GCPIntegration{}

		if err := db.Offset(i * stepSize).Limit(stepSize).Find(&gcps).Error; err != nil {
			return err
		}

		// decrypt with the old key
		for _, gcp := range gcps {
			err := repo.DecryptGCPIntegrationData(gcp, oldKey)

			if err != nil {
				return err
			}
		}

		// encrypt with the new key and re-insert
		for _, gcp := range gcps {
			err := repo.EncryptGCPIntegrationData(gcp, newKey)

			if err != nil {
				return err
			}

			if err := db.Save(gcp).Error; err != nil {
				return err
			}
		}
	}

	fmt.Printf("rotated %d gcp integrations", count)

	return nil
}

func rotateAWSIntegrationModel(db *_gorm.DB, oldKey, newKey *[32]byte) error {
	// get count of model
	var count int64

	if err := db.Model(&ints.AWSIntegration{}).Count(&count).Error; err != nil {
		return err
	}

	// cluster-scoped repository
	repo := gorm.NewAWSIntegrationRepository(db, oldKey).(*gorm.AWSIntegrationRepository)

	// iterate (count / stepSize) + 1 times using Limit and Offset
	for i := 0; i < (int(count)/stepSize)+1; i++ {
		awss := []*ints.AWSIntegration{}

		if err := db.Offset(i * stepSize).Limit(stepSize).Find(&awss).Error; err != nil {
			return err
		}

		// decrypt with the old key
		for _, aws := range awss {
			err := repo.DecryptAWSIntegrationData(aws, oldKey)

			if err != nil {
				return err
			}
		}

		// encrypt with the new key and re-insert
		for _, aws := range awss {
			err := repo.EncryptAWSIntegrationData(aws, newKey)

			if err != nil {
				return err
			}

			if err := db.Save(aws).Error; err != nil {
				return err
			}
		}
	}

	fmt.Printf("rotated %d aws integrations", count)

	return nil
}
